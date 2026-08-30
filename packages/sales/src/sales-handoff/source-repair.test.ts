import { describe, expect, test } from "bun:test";
import {
	classifySalesHandoffSourceRepairCandidate,
	releaseSalesHandoffLifecycleReviews,
	runSalesHandoffSourceRepair,
} from "./source-repair";

const paymentMarker = {
	id: "sales-handoff-repair:91",
	scopeId: "91",
	meta: {
		reason:
			"Sales Handoff payment projection is unavailable for order 91: canonical PaymentProjection row was not found",
	},
	createdAt: new Date("2026-08-30T00:00:00.000Z"),
};

function order(overrides: Record<string, unknown> = {}) {
	return {
		id: 91,
		orderId: "LEGACY-91",
		type: "order",
		status: "Active",
		prodStatus: null,
		createdAt: new Date("2026-01-10T00:00:00.000Z"),
		deliveredAt: null,
		deletedAt: null,
		grandTotal: 100,
		amountDue: 0,
		paymentTerm: "NONE",
		payments: [{ status: "success", amount: 100, deletedAt: null }],
		inventoryProjection: null,
		paymentProjection: null,
		...overrides,
	};
}

function repairDb(input: {
	markers?: (typeof paymentMarker)[];
	orders?: ReturnType<typeof order>[];
}) {
	const resolved: unknown[] = [];
	const markerQueries: unknown[] = [];
	let projection: Record<string, unknown> | null = null;
	const markers = input.markers ?? [paymentMarker];
	const orders = input.orders ?? [order()];
	const db = {
		resolutionCase: {
			findMany: async (raw: unknown) => {
				markerQueries.push(raw);
				const query = raw as {
					where: { scopeId?: { in?: string[] } };
					cursor?: { id: string };
					skip?: number;
					take?: number;
				};
				const filtered = query.where.scopeId?.in
					? markers.filter((marker) =>
							query.where.scopeId?.in?.includes(marker.scopeId),
						)
					: markers;
				const cursorIndex = query.cursor
					? filtered.findIndex((marker) => marker.id === query.cursor?.id)
					: -1;
				const start = cursorIndex >= 0 ? cursorIndex + (query.skip ?? 0) : 0;
				return filtered.slice(start, start + (query.take ?? filtered.length));
			},
			updateMany: async (args: unknown) => {
				resolved.push(args);
				return { count: 1 };
			},
		},
		salesOrders: {
			findMany: async () => orders,
		},
		paymentProjection: {
			findMany: async () =>
				projection ? [{ salesOrderId: 91, ...projection }] : [],
			findUnique: async () => projection,
		},
	};
	return {
		db,
		resolved,
		markerQueries,
		setProjection(value: Record<string, unknown>) {
			projection = value;
		},
	};
}

describe("Sales Handoff source repair", () => {
	test("classifies pre-2026 blank-status orders for lifecycle review", () => {
		expect(
			classifySalesHandoffSourceRepairCandidate({
				marker: paymentMarker,
				order: order({
					status: "",
					createdAt: new Date("2025-12-31T23:59:59.000Z"),
				}),
				historicalCutoffYear: 2026,
			}),
		).toMatchObject({
			category: "PAYMENT",
			lifecycleReviewRequired: true,
			terminal: false,
		});
	});

	test("dry-run reports the planned repair without invoking mutation dependencies", async () => {
		const { db } = repairDb({});
		let mutations = 0;
		const result = await runSalesHandoffSourceRepair(
			db as never,
			{
				apply: false,
				actorUserId: 1,
				limit: 50,
			},
			{
				syncPaymentProjection: async () => {
					mutations += 1;
				},
				syncInventoryProjection: async () => {
					mutations += 1;
					return { projection: { status: "ready" } } as never;
				},
				reconcileOrder: async () => {
					mutations += 1;
					return [] as never;
				},
				recordLifecycleReview: async () => {
					mutations += 1;
					return {} as never;
				},
			},
		);

		expect(mutations).toBe(0);
		expect(result).toMatchObject({
			mode: "dry-run",
			scanned: 1,
			planned: 1,
			repaired: 0,
		});
	});

	test("supports explicit ids, bounded cursors, and idempotent payment retries", async () => {
		const marker92 = {
			...paymentMarker,
			id: "sales-handoff-repair:92",
			scopeId: "92",
		};
		const fixture = repairDb({
			markers: [paymentMarker, marker92],
			orders: [order(), order({ id: 92, orderId: "LEGACY-92" })],
		});
		fixture.setProjection({
			totalRecorded: 100,
			totalAllocated: 100,
			totalRefunded: 0,
			totalVoided: 0,
			amountDue: 0,
		});
		let syncs = 0;
		const dependencies = {
			syncPaymentProjection: async () => {
				syncs += 1;
			},
			syncInventoryProjection: async () => ({
				projection: { status: "ready" },
			}),
			reconcileOrder: async () => [] as never,
			recordLifecycleReview: async () => ({}) as never,
		};

		const explicit = await runSalesHandoffSourceRepair(
			fixture.db as never,
			{ actorUserId: 1, salesOrderIds: [92], limit: 1 },
			dependencies as never,
		);
		expect(explicit.results.map((result) => result.salesOrderId)).toEqual([92]);

		const applied = await runSalesHandoffSourceRepair(
			fixture.db as never,
			{
				apply: true,
				confirmReview: true,
				actorUserId: 1,
				salesOrderIds: [91],
			},
			dependencies as never,
		);
		expect(applied.repaired).toBe(1);
		expect(syncs).toBe(0);

		const cursorPage = await runSalesHandoffSourceRepair(fixture.db as never, {
			actorUserId: 1,
			cursor: paymentMarker.id,
			limit: 1,
		});
		expect(cursorPage.results.map((result) => result.salesOrderId)).toEqual([
			92,
		]);
	});

	test("refuses apply without explicit review confirmation", async () => {
		const { db } = repairDb({});
		await expect(
			runSalesHandoffSourceRepair(db as never, {
				apply: true,
				confirmReview: false,
				actorUserId: 1,
			}),
		).rejects.toThrow("--confirm-review");
	});

	test("repairs payment evidence then quarantines a historical ambiguous order", async () => {
		const fixture = repairDb({
			orders: [
				order({
					status: null,
					createdAt: new Date("2025-06-01T00:00:00.000Z"),
				}),
			],
		});
		const calls: string[] = [];
		const result = await runSalesHandoffSourceRepair(
			fixture.db as never,
			{
				apply: true,
				confirmReview: true,
				actorUserId: 1,
			},
			{
				syncPaymentProjection: async () => {
					calls.push("payment");
					fixture.setProjection({
						salesOrderId: 91,
						totalRecorded: 100,
						totalAllocated: 100,
						totalRefunded: 0,
						totalVoided: 0,
						amountDue: 0,
					});
				},
				syncInventoryProjection: async () => {
					throw new Error("not used");
				},
				reconcileOrder: async () => {
					calls.push("reconcile");
					return [] as never;
				},
				recordLifecycleReview: async () => {
					calls.push("quarantine");
					return {} as never;
				},
			},
		);

		expect(calls).toEqual(["payment", "quarantine"]);
		expect(fixture.resolved).toHaveLength(1);
		expect(result).toMatchObject({
			repaired: 0,
			quarantined: 1,
			failed: 0,
			results: [{ status: "QUARANTINED" }],
		});
	});

	test("keeps ready inventory open when synchronization returns warnings", async () => {
		const inventoryMarker = {
			...paymentMarker,
			id: "sales-handoff-repair:94",
			scopeId: "94",
			meta: {
				reason:
					"Sales Handoff inventory projection is unavailable for order 94: inventory applicability is syncing",
			},
		};
		const fixture = repairDb({
			markers: [inventoryMarker],
			orders: [order({ id: 94 })],
		});
		const result = await runSalesHandoffSourceRepair(
			fixture.db as never,
			{ apply: true, confirmReview: true, actorUserId: 1 },
			{
				syncPaymentProjection: async () => undefined,
				syncInventoryProjection: async () => ({
					projection: { status: "ready", needCount: 1 },
					warnings: ["mapping review still required"],
				}),
				reconcileOrder: async () => [] as never,
				recordLifecycleReview: async () => ({}) as never,
			},
		);
		expect(result).toMatchObject({ repaired: 0, failed: 1 });
	});

	test("reclassifies a repaired payment marker when exact reconciliation discovers missing inventory", async () => {
		const fixture = repairDb({});
		const repairReasons: string[] = [];
		const result = await runSalesHandoffSourceRepair(
			fixture.db as never,
			{ apply: true, confirmReview: true, actorUserId: 1 },
			{
				syncPaymentProjection: async () => {
					fixture.setProjection({
						totalRecorded: 100,
						totalAllocated: 100,
						totalRefunded: 0,
						totalVoided: 0,
						amountDue: 0,
					});
				},
				syncInventoryProjection: async () => ({
					projection: { status: "ready" },
				}),
				reconcileOrder: async () => {
					throw new Error(
						"Sales Handoff inventory projection is unavailable for order 91: inventory applicability is not_synced",
					);
				},
				recordLifecycleReview: async () => ({}) as never,
				recordRepair: async (_db, input) => {
					repairReasons.push(input.reason);
					return { recorded: true, salesOrderIds: [91] };
				},
			},
		);

		expect(repairReasons).toHaveLength(1);
		expect(result).toMatchObject({
			repaired: 0,
			unresolved: 1,
			failed: 0,
			results: [{ category: "INVENTORY", status: "UNRESOLVED" }],
		});
	});

	test("keeps an inventory repair open when synchronization remains failed", async () => {
		const inventoryMarker = {
			...paymentMarker,
			id: "sales-handoff-repair:92",
			scopeId: "92",
			meta: {
				reason:
					"Sales Handoff inventory projection is unavailable for order 92: inventory applicability is failed",
			},
		};
		const fixture = repairDb({
			markers: [inventoryMarker],
			orders: [order({ id: 92 })],
		});
		const result = await runSalesHandoffSourceRepair(
			fixture.db as never,
			{
				apply: true,
				confirmReview: true,
				actorUserId: 1,
			},
			{
				syncPaymentProjection: async () => {
					throw new Error("not used");
				},
				syncInventoryProjection: async () => ({
					projection: { status: "failed" },
					warnings: ["missing deterministic inventory mapping"],
				}),
				reconcileOrder: async () => [] as never,
				recordLifecycleReview: async () => ({}) as never,
			},
		);

		expect(fixture.resolved).toHaveLength(0);
		expect(result).toMatchObject({
			repaired: 0,
			failed: 1,
			mappingReview: [{ salesOrderId: 92 }],
			results: [
				{
					status: "FAILED",
					reason: "missing deterministic inventory mapping",
				},
			],
		});
	});

	test("retries stale syncing inventory and repairs only after ready is durable", async () => {
		const inventoryMarker = {
			...paymentMarker,
			id: "sales-handoff-repair:93",
			scopeId: "93",
			meta: {
				reason:
					"Sales Handoff inventory projection is unavailable for order 93: inventory applicability is syncing",
			},
		};
		const fixture = repairDb({
			markers: [inventoryMarker],
			orders: [
				order({
					id: 93,
					inventoryProjection: { status: "syncing", needCount: 0 },
				}),
			],
		});
		const result = await runSalesHandoffSourceRepair(
			fixture.db as never,
			{ apply: true, confirmReview: true, actorUserId: 1 },
			{
				syncPaymentProjection: async () => undefined,
				syncInventoryProjection: async () => ({
					projection: { status: "ready", needCount: 3 },
					warnings: [],
				}),
				reconcileOrder: async () => [] as never,
				recordLifecycleReview: async () => ({}) as never,
			},
		);
		expect(result).toMatchObject({ repaired: 1, failed: 0 });
	});
});

describe("Sales Handoff lifecycle review release", () => {
	test("requires audited confirmation and reconciles immediately after active-order approval", async () => {
		const calls: string[] = [];
		const db = {
			resolutionCase: {
				findMany: async () => [
					{
						id: "sales-handoff-lifecycle-review:91",
						scopeId: "91",
						meta: { source: "repair" },
					},
				],
				updateMany: async (input: unknown) => {
					const status = (input as { data: { status: string } }).data.status;
					calls.push(
						status === "releasing"
							? "claim"
							: status === "resolved"
								? "release"
								: "reopen",
					);
					return { count: 1 };
				},
			},
			salesOrders: {
				findMany: async () => [order({ status: null })],
			},
			resolutionAction: {
				create: async () => {
					calls.push("audit");
					return {};
				},
				update: async () => ({}),
				updateMany: async () => ({ count: 1 }),
			},
		};

		await expect(
			releaseSalesHandoffLifecycleReviews(db as never, {
				apply: true,
				confirmReview: false,
				actorUserId: 1,
				salesOrderIds: [91],
				decision: "ACTIVE_ORDER_APPROVED",
				reason: "Reviewed against archived paperwork.",
			}),
		).rejects.toThrow("--confirm-review");

		const report = await releaseSalesHandoffLifecycleReviews(
			db as never,
			{
				apply: true,
				confirmReview: true,
				actorUserId: 1,
				salesOrderIds: [91],
				decision: "ACTIVE_ORDER_APPROVED",
				reason: "Reviewed against archived paperwork.",
			},
			{
				reconcileOrder: async () => {
					calls.push("reconcile");
					return [] as never;
				},
			},
		);

		expect(calls).toEqual(["claim", "audit", "reconcile", "release"]);
		expect(report).toMatchObject({ released: 1, failed: 0 });
	});

	test("corrected-status release fails closed while canonical status is still blank", async () => {
		const db = {
			resolutionCase: {
				findMany: async () => [
					{ id: "sales-handoff-lifecycle-review:91", scopeId: "91", meta: {} },
				],
			},
			salesOrders: { findMany: async () => [order({ status: "" })] },
		};
		const report = await releaseSalesHandoffLifecycleReviews(db as never, {
			apply: false,
			confirmReview: false,
			actorUserId: 1,
			salesOrderIds: [91],
			decision: "CANONICAL_STATUS_CORRECTED",
			reason: "Status cleanup reviewed.",
		});
		expect(report).toMatchObject({ released: 0, failed: 1 });
	});
});
