import { describe, expect, test } from "bun:test";
import type {
	MaterialHandoffProjection,
	ProductionHandoffProjection,
} from "@gnd/sales";
import {
	SalesHandoffSourceProjectionUnavailableError,
	buildSalesHandoffSettlementTimeline,
	getMaterialSalesHandoffActions,
	getOpenSalesHandoffEpochWhere,
	normalizePaymentAllocationDelta,
	reconcileMaterialSalesHandoffEpoch,
	reconcileMaterialSalesHandoffOrder,
	reconcileProductionSalesHandoffEpoch,
	reconcileSalesHandoffAfterCommit,
} from "./sales-handoff-actions";

type Row = Record<string, unknown> & {
	id: string;
	salesOrderId: number;
	actionType: string;
	epoch: number;
	openKey: string | null;
	resolvedAt: Date | null;
};

function projection(
	overrides: Partial<MaterialHandoffProjection> = {},
): MaterialHandoffProjection {
	return {
		actionable: true,
		uncoveredQty: 4,
		applicableComponentCount: 1,
		reason: "ACTION_REQUIRED",
		evidenceRevision: "material-v1-a",
		...overrides,
	};
}

function productionProjection(
	overrides: Partial<ProductionHandoffProjection> = {},
): ProductionHandoffProjection {
	return {
		actionable: true,
		uncoveredQty: 4,
		productionItemCount: 1,
		reason: "ACTION_REQUIRED",
		evidenceRevision: "production-v1-a",
		orderRevision: "order-r1",
		targetSalesItemId: 10,
		targetControlUid: "item-10",
		targetAssignmentId: null,
		...overrides,
	};
}

function epochDb(initial: Row[] = []) {
	const rows = [...initial];
	let id = rows.length + 1;
	const matchingRows = (raw: unknown) => {
		const where = (raw as { where?: Record<string, unknown> } | undefined)
			?.where;
		if (!where) return [...rows];
		return rows.filter((row) => {
			if (
				typeof where.salesOrderId === "number" &&
				row.salesOrderId !== where.salesOrderId
			)
				return false;
			if (
				typeof where.actionType === "string" &&
				row.actionType !== where.actionType
			)
				return false;
			if (
				typeof where.actionType === "object" &&
				where.actionType &&
				!(where.actionType as { in?: string[] }).in?.includes(row.actionType)
			)
				return false;
			if (
				where.responsibleRepId &&
				row.responsibleRepId !== where.responsibleRepId
			)
				return false;
			if (where.resolvedAt === null && row.resolvedAt !== null) return false;
			if (
				typeof where.openKey === "object" &&
				where.openKey &&
				(row.openKey === null || row.openKey === undefined)
			)
				return false;
			return true;
		});
	};
	const repository = {
		findFirst: async (raw: unknown) => {
			const args = raw as {
				where: { openKey?: string; salesOrderId?: number; actionType?: string };
			};
			const matches = rows.filter((row) =>
				args.where.openKey
					? row.openKey === args.where.openKey
					: row.salesOrderId === args.where.salesOrderId &&
						row.actionType === args.where.actionType,
			);
			return matches.sort((left, right) => right.epoch - left.epoch)[0] ?? null;
		},
		findMany: async (raw: unknown) => {
			const args = raw as {
				select?: { salesOrderId?: boolean };
				take?: number;
			};
			const allMatches = matchingRows(raw);
			const matches = allMatches.slice(0, args.take ?? allMatches.length);
			return args.select?.salesOrderId
				? matches.map((row) => ({
						salesOrderId: row.salesOrderId,
						actionType: row.actionType,
					}))
				: matches;
		},
		count: async (raw: unknown) => matchingRows(raw).length,
		create: async (raw: unknown) => {
			const args = raw as { data: Record<string, unknown> };
			const row = {
				id: `epoch-${id++}`,
				...args.data,
			} as Row;
			rows.push(row);
			return row;
		},
		update: async (raw: unknown) => {
			const args = raw as {
				where: { id: string };
				data: Record<string, unknown>;
			};
			const index = rows.findIndex((row) => row.id === args.where.id);
			if (index < 0) throw new Error("epoch not found");
			rows[index] = { ...rows[index], ...args.data } as Row;
			const updated = rows[index];
			if (!updated) throw new Error("epoch update was not persisted");
			return updated;
		},
	};
	const db = {
		resolutionCase: {
			findMany: async () => [],
		},
		users: {
			findFirst: async () => ({
				id: 17,
				roles: [{ organizationId: 1, role: { name: "Sales Representative" } }],
			}),
			findMany: async () => [{ id: 17, name: "Sales Representative" }],
		},
		salesHandoffActionEpoch: repository,
		$transaction: async (
			callback: (tx: unknown) => Promise<unknown>,
			options: unknown,
		) => {
			expect(options).toEqual({ isolationLevel: "Serializable" });
			return callback({ salesHandoffActionEpoch: repository });
		},
	};
	return { db, rows };
}

describe("Material Sales Handoff epochs", () => {
	test("records durable repair without rejecting an already committed mutation", async () => {
		const repairs: unknown[] = [];
		const result = await reconcileSalesHandoffAfterCommit(
			{} as never,
			{
				salesOrderIds: [91, 91],
				actorUserId: 17,
				source: "test.payment",
			},
			{
				reconcile: async () => {
					throw new Error("epoch database unavailable");
				},
				recordRepair: async (_db, repair) => {
					repairs.push(repair);
					return { recorded: true };
				},
			},
		);

		expect(result).toEqual({
			status: "repair_recorded",
			salesOrderIds: [91],
		});
		expect(repairs).toEqual([
			{
				salesOrderIds: [91],
				actorUserId: 17,
				source: "test.payment",
				reason: "epoch database unavailable",
			},
		]);
	});

	test("treats same-second settlement activity atomically", () => {
		const occurredAt = new Date("2026-08-23T10:00:00.000Z");
		expect(
			buildSalesHandoffSettlementTimeline({
				salesOrderId: 91,
				allocations: [
					{
						id: "z-refund",
						ledgerEntryId: "ledger-refund",
						salesOrderId: 91,
						amount: -100,
						allocationType: "square_refund",
					},
					{
						id: "a-payment",
						ledgerEntryId: "ledger-payment",
						salesOrderId: 91,
						amount: 100,
						allocationType: "payment",
					},
					{
						id: "m-repayment",
						ledgerEntryId: "ledger-repayment",
						salesOrderId: 91,
						amount: 100,
						allocationType: "payment",
					},
				],
				occurredAtByLedgerId: new Map([
					["ledger-refund", occurredAt],
					["ledger-payment", occurredAt],
					["ledger-repayment", occurredAt],
				]),
			}),
		).toEqual([
			{
				id: "a-payment,m-repayment,z-refund",
				netSettledAmount: 100,
				occurredAt,
			},
		]);
	});

	test("opens once and idempotently updates the same open epoch", async () => {
		const { db, rows } = epochDb();
		const input = {
			salesOrderId: 91,
			orderId: "09388PC",
			responsibleRepId: 17,
			policyRevision: 3,
			qualifiedAt: "2026-08-23T10:00:00.000Z",
			initialExposureMilestone: "QUALIFICATION" as const,
			projection: projection(),
			reconciledByUserId: 17,
			now: new Date("2026-08-23T11:00:00.000Z"),
		};
		expect(
			await reconcileMaterialSalesHandoffEpoch(db as never, input),
		).toMatchObject({ transition: "opened" });
		expect(
			await reconcileMaterialSalesHandoffEpoch(db as never, {
				...input,
				projection: projection({
					uncoveredQty: 2,
					evidenceRevision: "material-v1-b",
				}),
			}),
		).toMatchObject({ transition: "updated" });
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			epoch: 1,
			openKey: "MATERIAL:91",
			uncoveredQty: 2,
			evidenceRevision: "material-v1-b",
			responsibleRepId: 17,
			openedAt: new Date("2026-08-23T10:00:00.000Z"),
		});
	});

	test("opens a first epoch at policy time only for policy exposure", async () => {
		const { db, rows } = epochDb();
		await reconcileMaterialSalesHandoffEpoch(db as never, {
			salesOrderId: 91,
			orderId: "09388PC",
			responsibleRepId: 17,
			policyRevision: 4,
			policyChangedAt: "2026-08-24T09:00:00.000Z",
			qualifiedAt: "2026-08-20T10:00:00.000Z",
			initialExposureMilestone: "POLICY_CHANGE",
			projection: projection(),
			reconciledByUserId: 17,
			now: new Date("2026-08-24T09:00:05.000Z"),
		});

		expect(rows[0]).toMatchObject({
			openedAt: new Date("2026-08-24T09:00:00.000Z"),
			escalationDueAt: new Date("2026-08-25T09:00:00.000Z"),
		});
	});

	test("opens a later evidence-loss first epoch at reconciliation time", async () => {
		const { db, rows } = epochDb();
		const now = new Date("2026-08-25T12:00:00.000Z");
		await reconcileMaterialSalesHandoffEpoch(db as never, {
			salesOrderId: 91,
			orderId: "09388PC",
			responsibleRepId: 17,
			policyRevision: 4,
			policyChangedAt: "2026-08-21T11:00:00.000Z",
			qualifiedAt: "2026-08-20T10:00:00.000Z",
			projection: projection({ evidenceRevision: "inbound-cancelled" }),
			reconciledByUserId: 17,
			now,
		});

		expect(rows[0]).toMatchObject({
			openedAt: now,
			escalationDueAt: new Date("2026-08-26T12:00:00.000Z"),
		});
	});

	test("transfers ownership without resetting the open epoch or escalation clock", async () => {
		const { db, rows } = epochDb();
		const common = {
			salesOrderId: 91,
			orderId: "09388PC",
			policyRevision: 3,
			qualifiedAt: "2026-08-23T10:00:00.000Z",
			initialExposureMilestone: "QUALIFICATION" as const,
			projection: projection(),
			reconciledByUserId: 41,
		};
		await reconcileMaterialSalesHandoffEpoch(db as never, {
			...common,
			responsibleRepId: 17,
			organizationId: 1,
			now: new Date("2026-08-23T11:00:00.000Z"),
		});
		if (rows[0]) rows[0].escalatedAt = new Date("2026-08-23T11:30:00.000Z");
		expect(
			await reconcileMaterialSalesHandoffEpoch(db as never, {
				...common,
				responsibleRepId: 18,
				organizationId: 2,
				now: new Date("2026-08-23T12:00:00.000Z"),
			}),
		).toMatchObject({ transition: "transferred" });

		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			epoch: 1,
			openKey: "MATERIAL:91",
			responsibleRepId: 18,
			organizationId: 2,
			openedAt: new Date("2026-08-23T10:00:00.000Z"),
			escalationDueAt: new Date("2026-08-24T10:00:00.000Z"),
			escalatedAt: null,
			resolvedAt: null,
		});
	});

	test("resolves and genuinely reopens as a new audited epoch", async () => {
		const { db, rows } = epochDb();
		const common = {
			salesOrderId: 91,
			orderId: "09388PC",
			responsibleRepId: 17,
			policyRevision: 3,
			qualifiedAt: "2026-08-23T10:00:00.000Z",
			reconciledByUserId: 17,
		};
		await reconcileMaterialSalesHandoffEpoch(db as never, {
			...common,
			projection: projection(),
			now: new Date("2026-08-23T11:00:00.000Z"),
		});
		expect(
			await reconcileMaterialSalesHandoffEpoch(db as never, {
				...common,
				projection: projection({
					actionable: false,
					uncoveredQty: 0,
					reason: "NO_UNCOVERED_MATERIAL",
				}),
				now: new Date("2026-08-23T12:00:00.000Z"),
			}),
		).toMatchObject({ transition: "resolved" });
		expect(rows[0]).toMatchObject({
			openKey: null,
			resolutionReason: "NO_UNCOVERED_MATERIAL",
			resolvedByUserId: 17,
		});
		expect(
			await reconcileMaterialSalesHandoffEpoch(db as never, {
				...common,
				projection: projection({ evidenceRevision: "material-v1-c" }),
				now: new Date("2026-08-24T09:00:00.000Z"),
			}),
		).toMatchObject({ transition: "reopened" });
		expect(rows).toHaveLength(2);
		expect(rows[1]).toMatchObject({
			epoch: 2,
			openKey: "MATERIAL:91",
			reopenedFromEpochId: rows[0]?.id,
		});
	});

	test("retries a concurrent open conflict and preserves one open epoch", async () => {
		const { db, rows } = epochDb();
		let transactions = 0;
		const concurrentDb = {
			...db,
			$transaction: async (
				callback: (tx: unknown) => Promise<unknown>,
				options: unknown,
			) => {
				transactions += 1;
				if (transactions === 1) {
					rows.push({
						id: "concurrent-epoch",
						salesOrderId: 91,
						actionType: "MATERIAL",
						epoch: 1,
						openKey: "MATERIAL:91",
						resolvedAt: null,
						responsibleRepId: 17,
					});
					throw Object.assign(new Error("unique conflict"), { code: "P2002" });
				}
				expect(options).toEqual({ isolationLevel: "Serializable" });
				return callback(db);
			},
		};

		const result = await reconcileMaterialSalesHandoffEpoch(
			concurrentDb as never,
			{
				salesOrderId: 91,
				orderId: "09388PC",
				responsibleRepId: 17,
				policyRevision: 3,
				qualifiedAt: "2026-08-23T10:00:00.000Z",
				projection: projection(),
				reconciledByUserId: 17,
			},
		);

		expect(result.transition).toBe("updated");
		expect(transactions).toBe(2);
		expect(rows).toHaveLength(1);
	});

	test("keeps Material and Production identities, resolution, and reopening independent", async () => {
		const { db, rows } = epochDb();
		const common = {
			salesOrderId: 91,
			orderId: "09388PC",
			responsibleRepId: 17,
			policyRevision: 3,
			qualifiedAt: "2026-08-23T10:00:00.000Z",
			reconciledByUserId: 17,
		};
		await reconcileMaterialSalesHandoffEpoch(db as never, {
			...common,
			projection: projection(),
		});
		await reconcileProductionSalesHandoffEpoch(db as never, {
			...common,
			projection: productionProjection(),
		});
		expect(rows.map((row) => row.openKey).sort()).toEqual([
			"MATERIAL:91",
			"PRODUCTION:91",
		]);

		await reconcileProductionSalesHandoffEpoch(db as never, {
			...common,
			projection: productionProjection({
				actionable: false,
				uncoveredQty: 0,
				reason: "FULLY_COVERED",
			}),
		});
		expect(rows.find((row) => row.actionType === "MATERIAL")?.openKey).toBe(
			"MATERIAL:91",
		);
		expect(rows.find((row) => row.actionType === "PRODUCTION")?.openKey).toBe(
			null,
		);
		await reconcileProductionSalesHandoffEpoch(db as never, {
			...common,
			projection: productionProjection({
				actionable: false,
				uncoveredQty: 0,
				reason: "FULLY_COVERED",
				orderRevision: "order-r2",
				evidenceRevision: "production-v1-completed-r2",
			}),
		});
		expect(rows.filter((row) => row.actionType === "PRODUCTION")).toHaveLength(
			1,
		);

		await reconcileProductionSalesHandoffEpoch(db as never, {
			...common,
			projection: productionProjection({
				uncoveredQty: 2,
				orderRevision: "order-r2",
				evidenceRevision: "production-v1-b",
			}),
		});
		expect(rows.filter((row) => row.actionType === "PRODUCTION")).toMatchObject(
			[
				{ epoch: 1, openKey: null },
				{ epoch: 2, openKey: "PRODUCTION:91", reopenedFromEpochId: "epoch-2" },
			],
		);
	});
});

describe("Material Sales Handoff protected read scope", () => {
	test("active Super Admin scope is organization-wide and never rep-filtered", async () => {
		const db = {
			users: {
				findFirst: async () => ({
					id: 7,
					roles: [{ organizationId: 4, role: { name: "Super Admin" } }],
				}),
			},
		};
		const result = await getOpenSalesHandoffEpochWhere(db as never, 7);
		expect(result).toMatchObject({
			scope: { kind: "SUPER_ADMIN", organizationIds: [4] },
			where: {
				organizationId: { in: [4] },
				resolvedAt: null,
				openKey: { not: null },
			},
		});
		expect(JSON.stringify(result.where)).not.toContain("responsibleRepId");
	});

	test("derives representative scope from the actor and clamps the bounded read", async () => {
		let orderQuery: unknown;
		let openEpochQuery: unknown;
		const repository = {
			findMany: async (input: unknown) => {
				if ((input as { select?: unknown }).select) openEpochQuery = input;
				return [];
			},
			findFirst: async () => null,
			count: async () => 0,
			create: async () => {
				throw new Error("unexpected create");
			},
			update: async () => {
				throw new Error("unexpected update");
			},
		};
		const db = {
			users: {
				findFirst: async () => ({
					id: 17,
					roles: [
						{ organizationId: 1, role: { name: "Sales Representative" } },
					],
				}),
				findMany: async () => [{ id: 17, name: "Sales Representative" }],
			},
			salesHandoffActionEpoch: repository,
			salesOrders: {
				findMany: async (input: unknown) => {
					orderQuery = input;
					return [];
				},
			},
			settings: { findFirst: async () => null },
			paymentAllocation: { findMany: async () => [] },
		};
		const result = await getMaterialSalesHandoffActions(db as never, {
			actorUserId: 17,
			limit: 999,
		});

		expect(orderQuery).toMatchObject({
			where: {
				type: "order",
				salesRepId: 17,
				deletedAt: null,
				deliveredAt: null,
			},
			orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
			take: 200,
			select: {
				itemControls: {
					where: { deletedAt: null },
					select: {
						uid: true,
						produceable: true,
						qtyControls: { where: { deletedAt: null } },
						assignments: { select: { assignedToId: true } },
					},
				},
			},
		});
		expect(JSON.stringify(orderQuery)).not.toContain("999");
		expect(openEpochQuery).toMatchObject({
			where: {
				actionType: { in: ["MATERIAL", "PRODUCTION"] },
				responsibleRepId: 17,
				resolvedAt: null,
			},
			orderBy: [
				{ openedAt: "asc" },
				{ orderId: "asc" },
				{ actionType: "asc" },
				{ id: "asc" },
			],
			take: 200,
			select: { salesOrderId: true, actionType: true },
		});
		expect(result).toEqual({
			actions: [],
			total: 0,
			counts: { MATERIAL: 0, PRODUCTION: 0 },
			limit: 50,
			truncated: false,
			scope: "REPRESENTATIVE",
		});
	});

	test("projects a paid tracked order into the representative's durable queue", async () => {
		const { db: epochRepositoryDb } = epochDb();
		const db = {
			...epochRepositoryDb,
			salesOrders: {
				findMany: async () => [
					{
						id: 91,
						orderId: "09388PC",
						type: "order",
						status: "pending",
						prodStatus: null,
						deliveredAt: null,
						deletedAt: null,
						paymentTerm: null,
						grandTotal: 100,
						salesRepId: 17,
						inventoryProjection: {
							status: "ready",
							needCount: 1,
							completedAt: new Date("2026-08-23T09:00:00.000Z"),
						},
						lineItems: [
							{
								components: [
									{
										id: 501,
										required: true,
										qty: 6,
										qtyAllocated: 1,
										qtyReceived: 0,
										status: "inbound_required",
										inventoryId: 5,
										inventoryVariantId: null,
										inventory: {
											id: 5,
											productKind: "inventory",
											stockMode: "monitored",
										},
										inventoryVariant: null,
										inventoryCategory: null,
										subComponent: null,
										inboundDemands: [],
									},
								],
							},
						],
					},
				],
			},
			settings: { findFirst: async () => null },
			paymentProjection: {
				findMany: async () => [
					{
						salesOrderId: 91,
						totalAllocated: 100,
						totalRefunded: 0,
						totalVoided: 0,
						amountDue: 0,
						version: 7,
					},
				],
			},
			paymentAllocation: {
				findMany: async () => [
					{
						id: "allocation-1",
						ledgerEntryId: "ledger-1",
						salesOrderId: 91,
						amount: 100,
						allocationType: "payment",
						createdAt: new Date("2026-08-23T10:00:00.000Z"),
					},
				],
			},
			paymentLedgerEntry: {
				findMany: async () => [
					{
						id: "ledger-1",
						occurredAt: new Date("2026-08-23T10:00:00.000Z"),
					},
				],
			},
		};

		const result = await getMaterialSalesHandoffActions(db as never, {
			actorUserId: 17,
			now: new Date("2026-08-23T11:00:00.000Z"),
		});

		expect(result).toMatchObject({
			total: 1,
			counts: { MATERIAL: 1, PRODUCTION: 0 },
			truncated: false,
		});
		expect(result.actions).toHaveLength(1);
		expect(result.actions[0]).toMatchObject({
			orderId: "09388PC",
			type: "MATERIAL",
			responsibleRepId: 17,
			uncoveredQty: 5,
			policyRevision: 0,
		});
	});

	test("projects paid production quantity into a targeted Production action", async () => {
		const { db: epochRepositoryDb } = epochDb();
		const updatedAt = new Date("2026-08-23T10:30:00.000Z");
		const db = {
			...epochRepositoryDb,
			salesOrders: {
				findMany: async () => [
					{
						id: 92,
						orderId: "09389PC",
						type: "order",
						status: "pending",
						prodStatus: null,
						deliveredAt: null,
						deletedAt: null,
						paymentTerm: null,
						grandTotal: 100,
						salesRepId: 17,
						updatedAt,
						inventoryProjection: null,
						lineItems: [],
						assignments: [
							{
								id: 71,
								itemId: 10,
								salesItemControlUid: null,
								salesDoorId: null,
								shelfItemId: null,
								assignedToId: 5,
								qtyAssigned: 2,
								lhQty: 0,
								rhQty: 0,
								completedAt: null,
								deletedAt: null,
								submissions: [],
							},
							{
								id: 72,
								itemId: 10,
								salesItemControlUid: "item-10",
								salesDoorId: null,
								shelfItemId: null,
								assignedToId: null,
								qtyAssigned: 4,
								lhQty: 0,
								rhQty: 0,
								completedAt: null,
								deletedAt: null,
								submissions: [],
							},
						],
						itemControls: [
							{
								uid: "item-10",
								orderItemId: 10,
								produceable: true,
								deletedAt: null,
								qtyControls: [
									{
										type: "qty",
										qty: 6,
										lh: 0,
										rh: 0,
										total: 6,
										itemTotal: 6,
										deletedAt: null,
									},
								],
								assignments: [],
							},
						],
					},
				],
			},
			settings: { findFirst: async () => null },
			paymentProjection: {
				findMany: async () => [
					{
						salesOrderId: 92,
						totalAllocated: 100,
						totalRefunded: 0,
						totalVoided: 0,
						amountDue: 0,
						version: 4,
					},
				],
			},
			paymentAllocation: {
				findMany: async () => [
					{
						id: "allocation-2",
						ledgerEntryId: "ledger-2",
						salesOrderId: 92,
						amount: 100,
						allocationType: "payment",
						createdAt: updatedAt,
					},
				],
			},
			paymentLedgerEntry: {
				findMany: async () => [{ id: "ledger-2", occurredAt: updatedAt }],
			},
		};

		const result = await getMaterialSalesHandoffActions(db as never, {
			actorUserId: 17,
			now: new Date("2026-08-23T11:00:00.000Z"),
		});

		expect(result.actions).toMatchObject([
			{
				orderId: "09389PC",
				type: "PRODUCTION",
				uncoveredQty: 4,
				targetSalesItemId: 10,
				targetControlUid: "item-10",
				targetAssignmentId: 72,
				orderRevision: updatedAt.toISOString(),
			},
		]);
		expect(result.counts).toEqual({ MATERIAL: 0, PRODUCTION: 1 });
		expect("assignedToId" in (result.actions[0] || {})).toBe(false);
		expect("canAssign" in (result.actions[0] || {})).toBe(false);
	});

	test("recent actionable work is not starved by more than 200 old orders and old opens still resolve", async () => {
		const openedAt = new Date("2025-01-01T00:00:00.000Z");
		const { db: epochRepositoryDb, rows } = epochDb([
			{
				id: "old-open",
				salesOrderId: 1,
				orderId: "OLD-1",
				actionType: "MATERIAL",
				epoch: 1,
				openKey: "MATERIAL:1",
				responsibleRepId: 17,
				policyRevision: 0,
				evidenceRevision: "old-evidence",
				uncoveredQty: 2,
				qualifiedAt: openedAt,
				openedAt,
				resolvedAt: null,
			},
		]);
		const oldOrders = Array.from({ length: 205 }, (_, index) => ({
			id: index + 1,
			orderId: `OLD-${index + 1}`,
			type: "order",
			status: "fulfilled",
			prodStatus: "completed",
			deliveredAt: new Date("2025-01-02T00:00:00.000Z"),
			deletedAt: null,
			paymentTerm: null,
			grandTotal: 100,
			salesRepId: 17,
			createdAt: new Date(
				`2025-01-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
			),
			updatedAt: new Date("2025-02-01T00:00:00.000Z"),
			inventoryProjection: null,
			lineItems: [],
		}));
		const recentOrder = {
			id: 999,
			orderId: "RECENT-PAID",
			type: "order",
			status: "pending",
			prodStatus: null,
			deliveredAt: null,
			deletedAt: null,
			paymentTerm: null,
			grandTotal: 100,
			salesRepId: 17,
			createdAt: new Date("2026-08-23T09:00:00.000Z"),
			updatedAt: new Date("2026-08-23T10:00:00.000Z"),
			inventoryProjection: {
				status: "ready",
				needCount: 1,
				completedAt: new Date("2026-08-23T09:30:00.000Z"),
			},
			lineItems: [
				{
					components: [
						{
							id: 9991,
							required: true,
							qty: 3,
							qtyAllocated: 0,
							qtyReceived: 0,
							status: "inbound_required",
							inventoryId: 5,
							inventoryVariantId: null,
							inventory: {
								id: 5,
								productKind: "inventory",
								stockMode: "monitored",
							},
							inventoryVariant: null,
							inventoryCategory: null,
							subComponent: null,
							inboundDemands: [],
						},
					],
				},
			],
		};
		const allOrders = [...oldOrders, recentOrder];
		const db = {
			...epochRepositoryDb,
			salesOrders: {
				findMany: async (raw: unknown) => {
					const args = raw as {
						where: Record<string, unknown> & {
							id?: { in?: number[]; notIn?: number[] };
						};
						orderBy?: Array<Record<string, "asc" | "desc">>;
						take?: number;
					};
					if (args.where.id?.in) {
						return allOrders.filter((order) =>
							args.where.id?.in?.includes(order.id),
						);
					}
					let candidates = allOrders.filter(
						(order) =>
							order.salesRepId === args.where.salesRepId &&
							order.type === args.where.type &&
							order.deletedAt === null &&
							order.deliveredAt === null &&
							!args.where.id?.notIn?.includes(order.id) &&
							![
								"cancelled",
								"canceled",
								"completed",
								"complete",
								"delivered",
								"fulfilled",
							].includes(order.status),
					);
					const recentFirst = args.orderBy?.[0]?.updatedAt === "desc";
					candidates = candidates.sort((left, right) =>
						recentFirst
							? right.updatedAt.getTime() - left.updatedAt.getTime()
							: left.createdAt.getTime() - right.createdAt.getTime(),
					);
					return candidates.slice(0, args.take ?? candidates.length);
				},
			},
			settings: { findFirst: async () => null },
			paymentProjection: {
				findMany: async (raw: unknown) => {
					const ids = (raw as { where: { salesOrderId: { in: number[] } } })
						.where.salesOrderId.in;
					return ids.includes(999)
						? [
								{
									salesOrderId: 999,
									totalAllocated: 100,
									totalRefunded: 0,
									totalVoided: 0,
									amountDue: 0,
									version: 1,
								},
							]
						: [];
				},
			},
			paymentAllocation: {
				findMany: async (raw: unknown) => {
					const ids = (raw as { where: { salesOrderId: { in: number[] } } })
						.where.salesOrderId.in;
					return ids.includes(999)
						? [
								{
									id: "recent-allocation",
									ledgerEntryId: "recent-ledger",
									salesOrderId: 999,
									amount: 100,
									allocationType: "payment",
									createdAt: recentOrder.updatedAt,
								},
							]
						: [];
				},
			},
			paymentLedgerEntry: {
				findMany: async () => [
					{
						id: "recent-ledger",
						occurredAt: recentOrder.updatedAt,
					},
				],
			},
		};

		const result = await getMaterialSalesHandoffActions(db as never, {
			actorUserId: 17,
			now: new Date("2026-08-23T11:00:00.000Z"),
		});

		expect(result.actions.map((action) => action.orderId)).toEqual([
			"RECENT-PAID",
		]);
		expect(rows.find((row) => row.id === "old-open")).toMatchObject({
			openKey: null,
			resolvedAt: new Date("2026-08-23T11:00:00.000Z"),
		});
	});
});

function exactActionableOrder() {
	return {
		id: 999,
		orderId: "EXACT-999",
		type: "order",
		status: "pending",
		prodStatus: null,
		deliveredAt: null,
		deletedAt: null,
		paymentTerm: null,
		grandTotal: 100,
		salesRepId: 17,
		orgId: 1,
		updatedAt: new Date("2026-08-23T09:00:00.000Z"),
		inventoryProjection: {
			status: "ready",
			needCount: 1,
			completedAt: new Date("2026-08-23T09:00:00.000Z"),
		},
		lineItems: [
			{
				components: [
					{
						id: 9991,
						required: true,
						qty: 3,
						qtyAllocated: 0,
						qtyReceived: 0,
						status: "inbound_required",
						inventoryId: 5,
						inventoryVariantId: null,
						inventory: {
							id: 5,
							productKind: "inventory",
							stockMode: "monitored",
						},
						inventoryVariant: null,
						inventoryCategory: null,
						subComponent: null,
						inboundDemands: [],
					},
				],
			},
		],
		assignments: [],
		itemControls: [],
	};
}

function exactProductionOrderWithUnavailableInventory() {
	return {
		...exactActionableOrder(),
		inventoryProjection: null,
		lineItems: [],
		assignments: [],
		itemControls: [
			{
				uid: "item-999",
				orderItemId: 9991,
				produceable: true,
				deletedAt: null,
				qtyControls: [
					{
						type: "qty",
						qty: 3,
						lh: 0,
						rh: 0,
						total: 3,
						itemTotal: 3,
						deletedAt: null,
					},
				],
				assignments: [],
			},
		],
	};
}

function exactPaidOrderDb(epochRepositoryDb: unknown, order: unknown) {
	const occurredAt = new Date("2026-08-23T10:00:00.000Z");
	return {
		...(epochRepositoryDb as Record<string, unknown>),
		salesOrders: { findFirst: async () => order },
		settings: { findFirst: async () => null },
		paymentProjection: {
			findFirst: async () => ({
				salesOrderId: 999,
				totalAllocated: 100,
				totalRefunded: 0,
				totalVoided: 0,
				amountDue: 0,
				version: 1,
			}),
		},
		paymentAllocation: {
			findMany: async () => [
				{
					id: "allocation-1",
					ledgerEntryId: "ledger-1",
					salesOrderId: 999,
					amount: 100,
					allocationType: "payment",
				},
			],
		},
		paymentLedgerEntry: {
			findMany: async () => [{ id: "ledger-1", occurredAt }],
		},
	};
}

describe("exact affected-order reconciliation", () => {
	test("creates lifecycle review before reconciling a historical blank-status order", async () => {
		const { db: epochRepositoryDb, rows } = epochDb();
		const reviews: unknown[] = [];
		let paymentReads = 0;
		const db = {
			...(epochRepositoryDb as Record<string, unknown>),
			salesOrders: {
				findFirst: async () => ({
					...exactActionableOrder(),
					status: null,
					createdAt: new Date("2025-12-31T23:59:59.000Z"),
				}),
			},
			resolutionCase: {
				findMany: async () => [],
				upsert: async (input: unknown) => {
					reviews.push(input);
					return input;
				},
			},
			paymentProjection: {
				findFirst: async () => {
					paymentReads += 1;
					return null;
				},
			},
		};

		const result = await reconcileMaterialSalesHandoffOrder(db as never, {
			salesOrderId: 999,
			actorUserId: 41,
		});

		expect(result).toMatchObject({ status: "LIFECYCLE_REVIEW" });
		expect(reviews).toHaveLength(1);
		expect(paymentReads).toBe(0);
		expect(rows).toHaveLength(0);
	});

	test("preserves existing epochs while lifecycle review quarantines reconciliation", async () => {
		const openedAt = new Date("2026-08-22T10:00:00.000Z");
		const { db: epochRepositoryDb, rows } = epochDb([
			{
				id: "material-open",
				salesOrderId: 999,
				orderId: "EXACT-999",
				actionType: "MATERIAL",
				epoch: 1,
				openKey: "MATERIAL:999",
				responsibleRepId: 17,
				policyRevision: 1,
				evidenceRevision: "known-before-review",
				uncoveredQty: 3,
				qualifiedAt: openedAt,
				openedAt,
				resolvedAt: null,
			},
		]);
		let paymentReads = 0;
		const db = {
			...(epochRepositoryDb as Record<string, unknown>),
			salesOrders: { findFirst: async () => exactActionableOrder() },
			resolutionCase: {
				findMany: async () => [{ scopeId: "999" }],
			},
			paymentProjection: {
				findFirst: async () => {
					paymentReads += 1;
					return null;
				},
			},
		};

		const result = await reconcileMaterialSalesHandoffOrder(db as never, {
			salesOrderId: 999,
			actorUserId: 41,
		});

		expect(result).toMatchObject({ status: "LIFECYCLE_REVIEW" });
		expect(paymentReads).toBe(0);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			id: "material-open",
			openKey: "MATERIAL:999",
			resolvedAt: null,
		});
	});

	test("replays a durable policy exposure at its original policy time", async () => {
		const policyChangedAt = "2026-08-24T09:00:00.000Z";
		const { db: epochRepositoryDb, rows } = epochDb();
		const db = {
			...exactPaidOrderDb(epochRepositoryDb, exactActionableOrder()),
			settings: {
				findFirst: async () => ({
					meta: {
						salesHandoffTrigger: {
							mode: "FULLY_PAID",
							percentage: null,
							revision: 8,
							changedAt: "2026-08-24T12:00:00.000Z",
						},
					},
				}),
			},
		};

		await reconcileMaterialSalesHandoffOrder(db as never, {
			salesOrderId: 999,
			actorUserId: 41,
			now: new Date("2026-08-25T15:00:00.000Z"),
			initialExposureMilestone: "POLICY_CHANGE",
			initialExposurePolicyRevision: 7,
			initialExposurePolicyChangedAt: policyChangedAt,
		});

		expect(rows.find((row) => row.actionType === "MATERIAL")).toMatchObject({
			policyRevision: 8,
			openedAt: new Date(policyChangedAt),
		});
	});

	test("preserves an existing Material epoch while unavailable inventory still allows Production repair", async () => {
		const openedAt = new Date("2026-08-22T10:00:00.000Z");
		const { db: epochRepositoryDb, rows } = epochDb([
			{
				id: "material-open",
				salesOrderId: 999,
				orderId: "EXACT-999",
				actionType: "MATERIAL",
				epoch: 1,
				openKey: "MATERIAL:999",
				responsibleRepId: 17,
				policyRevision: 1,
				evidenceRevision: "material-known-before-source-loss",
				uncoveredQty: 3,
				qualifiedAt: openedAt,
				openedAt,
				resolvedAt: null,
			},
		]);
		const db = exactPaidOrderDb(
			epochRepositoryDb,
			exactProductionOrderWithUnavailableInventory(),
		);

		await reconcileMaterialSalesHandoffOrder(db as never, {
			salesOrderId: 999,
			actorUserId: 41,
			now: new Date("2026-08-23T11:00:00.000Z"),
		});

		expect(rows.find((row) => row.actionType === "MATERIAL")).toMatchObject({
			id: "material-open",
			openKey: "MATERIAL:999",
			resolvedAt: null,
		});
		expect(rows.find((row) => row.actionType === "PRODUCTION")).toMatchObject({
			openKey: "PRODUCTION:999",
			uncoveredQty: 3,
		});
	});

	test("does not invent or resolve Material when unavailable inventory accompanies a known Production action", async () => {
		const { db: epochRepositoryDb, rows } = epochDb();
		const db = exactPaidOrderDb(
			epochRepositoryDb,
			exactProductionOrderWithUnavailableInventory(),
		);

		await reconcileMaterialSalesHandoffOrder(db as never, {
			salesOrderId: 999,
			actorUserId: 41,
			now: new Date("2026-08-23T11:00:00.000Z"),
		});

		expect(rows.filter((row) => row.actionType === "MATERIAL")).toHaveLength(0);
		expect(rows.filter((row) => row.actionType === "PRODUCTION")).toHaveLength(
			1,
		);
	});

	test("fails visibly when canonical payment evidence is unavailable", async () => {
		const { db: epochRepositoryDb } = epochDb();
		const db = {
			...epochRepositoryDb,
			salesOrders: { findFirst: async () => exactActionableOrder() },
			settings: { findFirst: async () => null },
			paymentProjection: { findFirst: async () => null },
			paymentAllocation: { findMany: async () => [] },
		};

		await expect(
			reconcileMaterialSalesHandoffOrder(db as never, {
				salesOrderId: 999,
				actorUserId: 41,
			}),
		).rejects.toBeInstanceOf(SalesHandoffSourceProjectionUnavailableError);
	});

	test("fails visibly instead of projecting an empty queue from unavailable inventory evidence", async () => {
		const { db: epochRepositoryDb } = epochDb();
		const occurredAt = new Date("2026-08-23T10:00:00.000Z");
		const order = {
			...exactActionableOrder(),
			inventoryProjection: null,
			lineItems: [],
		};
		const db = {
			...epochRepositoryDb,
			salesOrders: { findFirst: async () => order },
			settings: { findFirst: async () => null },
			paymentProjection: {
				findFirst: async () => ({
					salesOrderId: 999,
					totalAllocated: 100,
					totalRefunded: 0,
					totalVoided: 0,
					amountDue: 0,
					version: 1,
				}),
			},
			paymentAllocation: {
				findMany: async () => [
					{
						id: "allocation-1",
						ledgerEntryId: "ledger-1",
						salesOrderId: 999,
						amount: 100,
						allocationType: "payment",
					},
				],
			},
			paymentLedgerEntry: {
				findMany: async () => [{ id: "ledger-1", occurredAt }],
			},
		};

		await expect(
			reconcileMaterialSalesHandoffOrder(db as never, {
				salesOrderId: 999,
				actorUserId: 41,
			}),
		).rejects.toThrow("inventory projection is unavailable");
	});

	test("repairs an order outside the bounded read and resolves deleted rows exactly", async () => {
		const openedAt = new Date("2025-01-01T00:00:00.000Z");
		const initial = ["MATERIAL", "PRODUCTION"].map((actionType, index) => ({
			id: `old-open-${index}`,
			salesOrderId: 999,
			orderId: "EXACT-999",
			actionType,
			epoch: 1,
			openKey: `${actionType}:999`,
			responsibleRepId: 17,
			policyRevision: 1,
			evidenceRevision: "old",
			uncoveredQty: 1,
			qualifiedAt: openedAt,
			openedAt,
			resolvedAt: null,
		}));
		const { db: epochRepositoryDb, rows } = epochDb(initial);
		let exactOrderQuery: unknown;
		const db = {
			...epochRepositoryDb,
			salesOrders: {
				findFirst: async (input: unknown) => {
					exactOrderQuery = input;
					return null;
				},
				findMany: async () => {
					throw new Error("bounded actor read must not run for exact repair");
				},
			},
		};

		await reconcileMaterialSalesHandoffOrder(db as never, {
			salesOrderId: 999,
			actorUserId: 41,
			now: new Date("2026-08-23T13:00:00.000Z"),
		});

		expect(exactOrderQuery).toMatchObject({ where: { id: 999 } });
		expect(rows.filter((row) => row.salesOrderId === 999)).toMatchObject([
			{
				actionType: "MATERIAL",
				openKey: null,
				resolutionReason: "ORDER_NOT_FOUND",
			},
			{
				actionType: "PRODUCTION",
				openKey: null,
				resolutionReason: "ORDER_NOT_FOUND",
			},
		]);
	});

	test("normalizes negative Square refunds, resets SLA, and repays into a new epoch", async () => {
		expect(
			normalizePaymentAllocationDelta({
				allocationType: "square_refund",
				amount: -100,
			}),
		).toBe(-100);
		const { db: epochRepositoryDb, rows } = epochDb();
		let stage: "paid" | "refunded" | "repaid" = "paid";
		let allocationQuery: unknown;
		const paymentAt = new Date("2026-08-23T10:00:00.000Z");
		const refundAt = new Date("2026-08-23T11:00:00.000Z");
		const repaymentAt = new Date("2026-08-23T12:00:00.000Z");
		const db = {
			...epochRepositoryDb,
			salesOrders: { findFirst: async () => exactActionableOrder() },
			settings: { findFirst: async () => null },
			paymentProjection: {
				findFirst: async () => ({
					salesOrderId: 999,
					totalAllocated: stage === "repaid" ? 200 : 100,
					totalRefunded: stage === "paid" ? 0 : 100,
					totalVoided: 0,
					amountDue: stage === "refunded" ? 100 : 0,
					version: stage === "paid" ? 1 : stage === "refunded" ? 2 : 3,
				}),
			},
			paymentAllocation: {
				findMany: async (input: unknown) => {
					allocationQuery = input;
					return [
						{
							id: "payment-1",
							ledgerEntryId: "ledger-payment-1",
							salesOrderId: 999,
							amount: 100,
							allocationType: "payment",
							createdAt: paymentAt,
						},
						...(stage === "paid"
							? []
							: [
									{
										id: "refund-1",
										ledgerEntryId: "ledger-refund-1",
										salesOrderId: 999,
										amount: -100,
										allocationType: "square_refund",
										createdAt: refundAt,
									},
								]),
						...(stage === "repaid"
							? [
									{
										id: "payment-2",
										ledgerEntryId: "ledger-payment-2",
										salesOrderId: 999,
										amount: 100,
										allocationType: "payment",
										createdAt: repaymentAt,
									},
								]
							: []),
					];
				},
			},
			paymentLedgerEntry: {
				findMany: async () => [
					{ id: "ledger-payment-1", occurredAt: paymentAt },
					{ id: "ledger-refund-1", occurredAt: refundAt },
					{ id: "ledger-payment-2", occurredAt: repaymentAt },
				],
			},
		};
		const reconcile = () =>
			reconcileMaterialSalesHandoffOrder(db as never, {
				salesOrderId: 999,
				actorUserId: 41,
			});

		await reconcile();
		stage = "refunded";
		await reconcile();
		expect(rows[0]).toMatchObject({
			openKey: null,
			resolutionReason: "PAYMENT_NOT_QUALIFIED",
		});
		stage = "repaid";
		await reconcile();

		expect(allocationQuery).toMatchObject({
			where: {
				allocationType: {
					in: ["payment", "refund", "void", "square_refund"],
				},
			},
		});
		const materialEpochs = rows.filter((row) => row.actionType === "MATERIAL");
		expect(materialEpochs).toHaveLength(2);
		expect(materialEpochs[1]).toMatchObject({
			epoch: 2,
			openKey: "MATERIAL:999",
			qualifiedAt: repaymentAt,
		});
	});
});
