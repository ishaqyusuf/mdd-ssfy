import { describe, expect, test } from "bun:test";
import { reconcileSalesHandoffPolicyAfterCommit } from "@gnd/sales/sales-handoff";
import {
	SALES_HANDOFF_RECONCILIATION_ACTOR_USER_ID,
	SALES_HANDOFF_RECONCILIATION_BATCH_LIMIT,
	isSalesHandoffReconciliationScheduleEnabled,
	runSalesHandoffReconciliation,
	selectSalesHandoffReconciliationBatch,
} from "./sales-handoff-reconciliation-schedule";

type RepairRow = {
	id: string;
	scopeId: string;
	scopeType: string;
	meta?: unknown;
};
type EpochRow = { id: string; salesOrderId: number; openedAt: Date };

function selectionDb(input: {
	meta?: unknown;
	repairs?: RepairRow[];
	epochs?: EpochRow[];
	activeOrderIds?: number[];
	policy?: { revision: number; changedAt: string };
}) {
	const activeQueries: unknown[] = [];
	const scheduleRows: Array<{ value: number; meta: unknown }> = [];
	const workerRepairs: unknown[] = [];
	const resolvedCases: unknown[] = [];
	const repairs = input.repairs ?? [];
	const epochs = input.epochs ?? [];
	const activeOrderIds = input.activeOrderIds ?? [];
	const db = {
		scheduleHistory: {
			findFirst: async () => (input.meta ? { meta: input.meta } : null),
			create: async ({ data }: { data: { value: number; meta: unknown } }) => {
				scheduleRows.push(data);
				return data;
			},
		},
		resolutionCase: {
			findMany: async (raw: unknown) => {
				const { where, take } = raw as {
					where: { scopeType: string };
					take: number;
				};
				return repairs
					.filter((repair) => repair.scopeType === where.scopeType)
					.slice(0, take);
			},
			upsert: async (args: unknown) => {
				workerRepairs.push(args);
				return args;
			},
			updateMany: async (args: unknown) => {
				resolvedCases.push(args);
				return { count: 1 };
			},
		},
		salesHandoffActionEpoch: {
			findMany: async (raw: unknown) => {
				const { where, take } = raw as {
					where: {
						OR?: Array<{
							openedAt?: Date | { gt?: Date };
							id?: { gt?: string };
						}>;
					};
					take: number;
				};
				const cursor = where.OR?.[1];
				const cursorDate = cursor?.openedAt as Date | undefined;
				const cursorId = cursor?.id?.gt as string | undefined;
				return epochs
					.filter(
						(epoch) =>
							!cursorDate ||
							epoch.openedAt > cursorDate ||
							(epoch.openedAt.getTime() === cursorDate.getTime() &&
								epoch.id > String(cursorId)),
					)
					.slice(0, take);
			},
		},
		salesOrders: {
			findMany: async (raw: unknown) => {
				const query = raw as {
					where: {
						id?: { gt?: number; notIn?: number[] };
					};
					take: number;
				};
				activeQueries.push(query);
				const after = query.where.id?.gt ?? 0;
				const excluded = new Set<number>(query.where.id?.notIn ?? []);
				return activeOrderIds
					.filter((id) => id > after && !excluded.has(id))
					.slice(0, query.take)
					.map((id) => ({ id }));
			},
		},
		users: {
			findFirst: async (raw: unknown) => {
				const { where } = raw as { where: { id: number } };
				return where.id === 9 ? { id: 9 } : null;
			},
		},
		settings: {
			findFirst: async () =>
				input.policy
					? {
							meta: {
								salesHandoffTrigger: {
									mode: "FULLY_PAID",
									percentage: null,
									...input.policy,
								},
							},
						}
					: null,
		},
	};
	return {
		db,
		activeQueries,
		scheduleRows,
		workerRepairs,
		resolvedCases,
	};
}

describe("Sales Handoff reconciliation batch", () => {
	test("keeps the recurring schedule disabled until production is explicitly approved", () => {
		expect(isSalesHandoffReconciliationScheduleEnabled(undefined)).toBe(false);
		expect(isSalesHandoffReconciliationScheduleEnabled("false")).toBe(false);
		expect(isSalesHandoffReconciliationScheduleEnabled("TRUE")).toBe(true);
	});

	test("retries transient policy-marker persistence without repeating the immediate pass", async () => {
		let markerAttempts = 0;
		let immediateRuns = 0;
		const result = await reconcileSalesHandoffPolicyAfterCommit(
			{} as never,
			{
				policyRevision: 7,
				policyChangedAt: "2026-08-23T09:00:00.000Z",
				actorUserId: 9,
				source: "test.settings.transient-marker",
			},
			{
				recordRepair: async (_db, marker) => {
					markerAttempts += 1;
					if (markerAttempts === 1) throw new Error("temporary marker failure");
					return { recorded: true, policyRevision: marker.policyRevision };
				},
				reconcile: async () => {
					immediateRuns += 1;
					return [];
				},
			},
		);

		expect(result).toEqual({ status: "reconciled" });
		expect(markerAttempts).toBe(2);
		expect(immediateRuns).toBe(1);
	});

	test("successful bounded policy reconciliation leaves a marker that reaches orders beyond its immediate cohort", async () => {
		const policyChangedAt = "2026-08-23T09:00:00.000Z";
		const activeOrderIds = Array.from({ length: 201 }, (_, index) => index + 1);
		const immediateOrderIds = activeOrderIds.slice(1);
		const callOrder: string[] = [];
		const policyMarkers: Array<Record<string, unknown>> = [];

		const result = await reconcileSalesHandoffPolicyAfterCommit(
			{} as never,
			{
				policyRevision: 7,
				policyChangedAt,
				actorUserId: 9,
				source: "test.settings.success",
			},
			{
				recordRepair: async (_db, marker) => {
					callOrder.push("marker");
					policyMarkers.push(marker);
					return { recorded: true, policyRevision: marker.policyRevision };
				},
				reconcile: async () => {
					callOrder.push("immediate");
					expect(immediateOrderIds).toHaveLength(200);
					expect(immediateOrderIds).not.toContain(1);
					return [];
				},
			},
		);

		expect(result).toEqual({ status: "reconciled" });
		expect(callOrder).toEqual(["marker", "immediate"]);
		expect(policyMarkers).toEqual([
			expect.objectContaining({
				policyRevision: 7,
				policyChangedAt,
			}),
		]);

		const { db } = selectionDb({
			repairs: [
				{
					id: "policy-7",
					scopeId: "7",
					scopeType: "sales_handoff_policy_reconciliation",
					meta: policyMarkers[0],
				},
			],
			activeOrderIds,
			policy: { revision: 7, changedAt: policyChangedAt },
		});
		const beyondImmediate: Array<Record<string, unknown>> = [];
		await runSalesHandoffReconciliation(db as never, {
			actorUserId: 9,
			dependencies: {
				reconcileOrder: async (_db, request) => {
					if (request.salesOrderId === 1) beyondImmediate.push(request);
					return [] as never;
				},
				recordOrderRepair: async () => ({ recorded: true, salesOrderIds: [] }),
				resolveOrderRepairs: async () => ({ count: 0 }),
			},
		});

		expect(beyondImmediate).toEqual([
			expect.objectContaining({
				salesOrderId: 1,
				initialExposureMilestone: "POLICY_CHANGE",
				initialExposurePolicyRevision: 7,
				initialExposurePolicyChangedAt: policyChangedAt,
			}),
		]);
	});

	test("prioritizes and deduplicates repair markers and rotating open epochs while reserving active cursor progress", async () => {
		const repairs = Array.from({ length: 100 }, (_, index) => ({
			id: `repair-${index + 1}`,
			scopeId: String(index + 1),
			scopeType: "sales_handoff_reconciliation",
		}));
		const epochs = Array.from({ length: 70 }, (_, index) => ({
			id: `epoch-${String(index).padStart(3, "0")}`,
			salesOrderId: 90 + index,
			openedAt: new Date(
				`2026-08-23T10:${String(index % 60).padStart(2, "0")}:00.000Z`,
			),
		})).sort(
			(left, right) =>
				left.openedAt.getTime() - right.openedAt.getTime() ||
				left.id.localeCompare(right.id),
		);
		const { db } = selectionDb({
			repairs,
			epochs,
			activeOrderIds: Array.from({ length: 400 }, (_, index) => index + 1),
		});

		const result = await selectSalesHandoffReconciliationBatch(db as never);
		expect(result.candidates).toHaveLength(
			SALES_HANDOFF_RECONCILIATION_BATCH_LIMIT,
		);
		expect(new Set(result.candidates.map((row) => row.salesOrderId)).size).toBe(
			SALES_HANDOFF_RECONCILIATION_BATCH_LIMIT,
		);
		expect(
			result.candidates.slice(0, 100).every((row) => row.source === "REPAIR"),
		).toBe(true);
		expect(
			result.candidates.filter((row) => row.source === "OPEN_EPOCH"),
		).toHaveLength(50);
		expect(
			result.candidates.filter((row) => row.source === "ACTIVE_CURSOR"),
		).toHaveLength(50);
	});

	test("advances and wraps the persisted active-order keyset cursor", async () => {
		const { db, activeQueries } = selectionDb({
			meta: {
				cursorAfter: {
					activeOrderId: 250,
					openEpoch: null,
					policyRevisionInProgress: null,
				},
			},
			activeOrderIds: Array.from({ length: 20 }, (_, index) => 251 + index),
		});

		const result = await selectSalesHandoffReconciliationBatch(db as never);
		expect(activeQueries[0]).toMatchObject({ where: { id: { gt: 250 } } });
		expect(result.activeWrapped).toBe(true);
		expect(result.cursorAfter.activeOrderId).toBeNull();
		expect(result.candidates.at(-1)?.salesOrderId).toBe(270);
	});

	test("rotates beyond the first fifty open epochs before wrapping", async () => {
		const epochs = Array.from({ length: 70 }, (_, index) => ({
			id: `epoch-${String(index + 1).padStart(3, "0")}`,
			salesOrderId: index + 1,
			openedAt: new Date(
				`2026-08-${String(Math.floor(index / 24) + 20).padStart(2, "0")}T${String(index % 24).padStart(2, "0")}:00:00.000Z`,
			),
		}));
		const first = await selectSalesHandoffReconciliationBatch(
			selectionDb({ epochs }).db as never,
		);
		expect(
			first.candidates.filter((row) => row.source === "OPEN_EPOCH"),
		).toHaveLength(50);
		expect(first.cursorAfter.openEpoch).not.toBeNull();

		const second = await selectSalesHandoffReconciliationBatch(
			selectionDb({
				epochs,
				meta: { cursorAfter: first.cursorAfter },
			}).db as never,
		);
		expect(
			second.candidates
				.filter((row) => row.source === "OPEN_EPOCH")
				.map((row) => row.salesOrderId),
		).toEqual(Array.from({ length: 20 }, (_, index) => index + 51));
		expect(second.openEpochWrapped).toBe(true);
		expect(second.cursorAfter.openEpoch).toBeNull();
	});

	test("restarts the active cursor for a new policy repair and preserves the policy exposure milestone", async () => {
		const { db, activeQueries, scheduleRows } = selectionDb({
			meta: {
				cursorAfter: {
					activeOrderId: 250,
					openEpoch: null,
					policyRevisionInProgress: 6,
				},
			},
			repairs: [
				{
					id: "policy-7",
					scopeId: "7",
					scopeType: "sales_handoff_policy_reconciliation",
				},
				{
					id: "repair-41",
					scopeId: "41",
					scopeType: "sales_handoff_reconciliation",
				},
			],
			activeOrderIds: [11],
			policy: {
				revision: 7,
				changedAt: "2026-08-23T09:00:00.000Z",
			},
		});
		const milestones: Array<{
			salesOrderId: number;
			milestone: unknown;
			policyRevision: unknown;
			policyChangedAt: unknown;
		}> = [];

		await runSalesHandoffReconciliation(db as never, {
			actorUserId: 9,
			dependencies: {
				reconcileOrder: async (_db, request) => {
					milestones.push({
						salesOrderId: request.salesOrderId,
						milestone: request.initialExposureMilestone,
						policyRevision: request.initialExposurePolicyRevision,
						policyChangedAt: request.initialExposurePolicyChangedAt,
					});
					return [] as never;
				},
				recordOrderRepair: async () => ({ recorded: true, salesOrderIds: [] }),
				resolveOrderRepairs: async () => ({ count: 0 }),
			},
		});

		const activeQuery = activeQueries[0] as {
			where: { id?: { gt?: number } };
		};
		expect(activeQuery.where.id?.gt).toBeUndefined();
		expect(milestones).toEqual([
			{
				salesOrderId: 41,
				milestone: undefined,
				policyRevision: undefined,
				policyChangedAt: undefined,
			},
			{
				salesOrderId: 11,
				milestone: "POLICY_CHANGE",
				policyRevision: 7,
				policyChangedAt: "2026-08-23T09:00:00.000Z",
			},
		]);
		expect(
			(scheduleRows[0]?.meta as { policyRevision?: number }).policyRevision,
		).toBe(7);
	});
});

describe("Sales Handoff recurring reconciliation", () => {
	test("records lifecycle-review candidates as skipped without resolving their source repair", async () => {
		const { db, scheduleRows, resolvedCases } = selectionDb({
			repairs: [
				{
					id: "repair-41",
					scopeId: "41",
					scopeType: "sales_handoff_reconciliation",
				},
			],
		});

		await runSalesHandoffReconciliation(db as never, {
			actorUserId: 9,
			dependencies: {
				reconcileOrder: async () => ({ status: "LIFECYCLE_REVIEW" }) as never,
				recordOrderRepair: async () => ({ recorded: true, salesOrderIds: [] }),
				resolveOrderRepairs: async () => ({ count: 0 }),
			},
		});

		expect(
			resolvedCases.some((raw) => {
				const where = (raw as { where?: { id?: { in?: string[] } } }).where;
				return where?.id?.in?.includes("repair-41") ?? false;
			}),
		).toBe(false);
		expect(scheduleRows[0]?.meta).toMatchObject({
			status: "COMPLETED",
			scanned: 1,
			reconciled: 0,
			failed: 0,
			skippedLifecycleReview: 1,
		});
	});

	test("leaves routine discovery unmarked so later evidence loss opens at reconciliation time", async () => {
		const { db } = selectionDb({ activeOrderIds: [12] });
		const milestones: unknown[] = [];

		await runSalesHandoffReconciliation(db as never, {
			actorUserId: 9,
			dependencies: {
				reconcileOrder: async (_db, request) => {
					milestones.push(request.initialExposureMilestone);
					return [] as never;
				},
				recordOrderRepair: async () => ({ recorded: true, salesOrderIds: [] }),
				resolveOrderRepairs: async () => ({ count: 0 }),
			},
		});

		expect(milestones).toEqual([undefined]);
	});

	test("fails visibly with both durable repair markers and failed run history", async () => {
		const { db, scheduleRows, workerRepairs } = selectionDb({
			repairs: [
				{
					id: "repair-41",
					scopeId: "41",
					scopeType: "sales_handoff_reconciliation",
				},
			],
		});
		const orderRepairs: unknown[] = [];

		await expect(
			runSalesHandoffReconciliation(db as never, {
				actorUserId: 9,
				dependencies: {
					reconcileOrder: async () => {
						throw new Error("payment projection unavailable");
					},
					recordOrderRepair: async (_db, repair) => {
						orderRepairs.push(repair);
						return { recorded: true, salesOrderIds: repair.salesOrderIds };
					},
					resolveOrderRepairs: async () => ({ count: 0 }),
				},
			}),
		).rejects.toThrow("1 of 1 Sales Handoff reconciliations failed");

		expect(orderRepairs).toHaveLength(1);
		expect(workerRepairs.length).toBeGreaterThan(0);
		expect(scheduleRows).toHaveLength(1);
		expect(scheduleRows[0]?.meta).toMatchObject({
			status: "FAILED",
			scanned: 1,
			reconciled: 0,
			failed: 1,
			failureCategoryCounts: { PAYMENT: 1 },
		});
	});

	test("preserves policy exposure through a durable repair after the policy fan-out completes", async () => {
		const policyChangedAt = "2026-08-23T09:00:00.000Z";
		const first = selectionDb({
			repairs: [
				{
					id: "policy-7",
					scopeId: "7",
					scopeType: "sales_handoff_policy_reconciliation",
				},
			],
			activeOrderIds: [91],
			policy: { revision: 7, changedAt: policyChangedAt },
		});
		const durableOrderRepairs: Array<Record<string, unknown>> = [];

		await expect(
			runSalesHandoffReconciliation(first.db as never, {
				actorUserId: 9,
				dependencies: {
					reconcileOrder: async () => {
						throw new Error("temporary source failure");
					},
					recordOrderRepair: async (_db, repair) => {
						durableOrderRepairs.push(repair);
						return { recorded: true, salesOrderIds: repair.salesOrderIds };
					},
					resolveOrderRepairs: async () => ({ count: 0 }),
				},
			}),
		).rejects.toThrow("1 of 1 Sales Handoff reconciliations failed");

		expect(durableOrderRepairs).toEqual([
			expect.objectContaining({
				salesOrderIds: [91],
				initialExposureMilestone: "POLICY_CHANGE",
				initialExposurePolicyRevision: 7,
				initialExposurePolicyChangedAt: policyChangedAt,
			}),
		]);
		expect(
			first.resolvedCases.some((raw) => {
				const args = raw as { where?: { id?: { in?: string[] } } };
				return args.where?.id?.in?.includes("policy-7");
			}),
		).toBe(true);

		const second = selectionDb({
			repairs: [
				{
					id: "repair-91",
					scopeId: "91",
					scopeType: "sales_handoff_reconciliation",
					meta: durableOrderRepairs[0],
				},
			],
		});
		const retried: Array<Record<string, unknown>> = [];
		await runSalesHandoffReconciliation(second.db as never, {
			actorUserId: 9,
			dependencies: {
				reconcileOrder: async (_db, request) => {
					retried.push(request);
					return [] as never;
				},
				recordOrderRepair: async () => ({ recorded: true, salesOrderIds: [] }),
				resolveOrderRepairs: async () => ({ count: 1 }),
			},
		});

		expect(retried).toEqual([
			expect.objectContaining({
				salesOrderId: 91,
				initialExposureMilestone: "POLICY_CHANGE",
				initialExposurePolicyRevision: 7,
				initialExposurePolicyChangedAt: policyChangedAt,
			}),
		]);
	});

	test("keeps the policy fan-out open when durable policy exposure cannot be recorded", async () => {
		const { db, resolvedCases } = selectionDb({
			repairs: [
				{
					id: "policy-7",
					scopeId: "7",
					scopeType: "sales_handoff_policy_reconciliation",
				},
			],
			activeOrderIds: [91],
			policy: {
				revision: 7,
				changedAt: "2026-08-23T09:00:00.000Z",
			},
		});

		await expect(
			runSalesHandoffReconciliation(db as never, {
				actorUserId: 9,
				dependencies: {
					reconcileOrder: async () => {
						throw new Error("temporary source failure");
					},
					recordOrderRepair: async () => {
						throw new Error("repair marker unavailable");
					},
					resolveOrderRepairs: async () => ({ count: 0 }),
				},
			}),
		).rejects.toThrow("1 of 1 Sales Handoff reconciliations failed");

		expect(
			resolvedCases.some((raw) => {
				const args = raw as { where?: { id?: { in?: string[] } } };
				return args.where?.id?.in?.includes("policy-7");
			}),
		).toBe(false);
	});

	test("uses the designated system actor", () => {
		expect(SALES_HANDOFF_RECONCILIATION_ACTOR_USER_ID).toBe(1);
	});
});
