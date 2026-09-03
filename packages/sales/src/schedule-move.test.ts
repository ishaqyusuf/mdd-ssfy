import { describe, expect, it, mock } from "bun:test";

import type { Db } from "@gnd/db";

import { resolveSalesPipelineSnapshot } from "./sales-pipeline";
import type { runSalesPipelineCommandTransaction } from "./sales-pipeline-command-executor";
import {
	SalesScheduleMoveError,
	fulfillmentScheduleMoveSchema,
	moveFulfillmentSchedule,
	moveProductionScheduleGroup,
	productionScheduleMoveSchema,
	resolveFulfillmentScheduleMoveCapability,
	resolveProductionScheduleMoveCapability,
	scheduleBusinessDate,
	scheduleMoveDate,
} from "./schedule-move";

function snapshot(
	overrides: {
		productionCompleted?: boolean;
		fulfillmentStatus?: string;
		dispatchStatus?: string;
	} = {},
) {
	return resolveSalesPipelineSnapshot({
		salesOrderId: 101,
		orderNo: "09502PC",
		commercial: { status: "open" },
		payment: { total: 100, amountDue: 0 },
		material: { applicability: "required", requiredQty: 1, readyQty: 1 },
		production: {
			configuredRequirement: true,
			requiredQty: 1,
			assignments: [
				{
					id: 11,
					active: true,
					assignedQty: 1,
					completedQty: overrides.productionCompleted ? 1 : 0,
					completedAt: overrides.productionCompleted
						? "2026-09-03T12:00:00.000Z"
						: null,
					dueDate: "2026-09-04T12:00:00.000Z",
					assignedToId: 7,
				},
			],
			submissions: [],
		},
		fulfillment: {
			configuredRequirement: true,
			requiredQty: 1,
			packedQty: 0,
			dispatches: overrides.dispatchStatus
				? [
						{
							id: 22,
							active: true,
							itemCount: 1,
							deliveredQty: 0,
							status: overrides.dispatchStatus,
							dueDate: "2026-09-04T12:00:00.000Z",
							proofCompleted: false,
							inventoryCommitted: false,
						},
					]
				: [],
		},
		legacy: { fulfillmentStatus: overrides.fulfillmentStatus },
	});
}

function commandHarness(current = snapshot()) {
	const history = new Map<string, Record<string, unknown>>();
	const productionUpdate = mock(async () => ({ count: 1 }));
	const fulfillmentUpdate = mock(async () => ({ count: 1 }));
	const fulfillmentFind = mock(async () => ({
		id: 22,
		salesOrderId: 101,
		status: "queue",
		dueDate: new Date("2026-09-04T12:00:00.000Z"),
		deliveredAt: null,
		deletedAt: null,
		driverId: 9,
		deliveryMode: "delivery",
	}));
	const tx = {
		$queryRaw: mock(async () => [{ id: 11 }]),
		salesHistory: {
			findUnique: mock(async ({ where }: { where: { id: string } }) => {
				const stored = history.get(where.id);
				return stored
					? {
							id: where.id,
							salesId: 101,
							name: String(stored.name),
							data: stored.data,
						}
					: null;
			}),
			create: mock(async ({ data }: { data: Record<string, unknown> }) => {
				history.set(String(data.id), data);
				return data;
			}),
		},
		orderItemProductionAssignments: {
			findMany: mock(async () => [
				{
					id: 11,
					assignedToId: 7,
					completedAt: null,
					qtyCompleted: 0,
				},
			]),
			updateMany: productionUpdate,
		},
		orderDelivery: {
			findFirst: fulfillmentFind,
			updateMany: fulfillmentUpdate,
		},
	} as unknown as Db;
	const runCommand = (async (
		_db: Db,
		input: { action: string },
		execute: (
			transactionDb: Db,
			decision: Record<string, unknown>,
		) => Promise<unknown>,
	) => ({
		executed: true as const,
		decision: {
			action: input.action,
			status: "ready" as const,
			revision: current.revision,
			reasons: [],
			affectedScopes: [],
		},
		value: await execute(tx, {
			action: input.action,
			status: "ready",
			revision: current.revision,
			reasons: [],
			affectedScopes: [],
		}),
	})) as typeof runSalesPipelineCommandTransaction;
	return {
		db: tx,
		history,
		productionUpdate,
		fulfillmentUpdate,
		fulfillmentFind,
		dependencies: {
			runCommand,
			getSnapshots: async () => new Map([[101, current]]),
		},
	};
}

describe("schedule move date contract", () => {
	it("parses only real date-only values and stores them at UTC noon", () => {
		expect(
			productionScheduleMoveSchema.safeParse({
				requestId: "11111111-1111-4111-8111-111111111111",
				salesOrderId: 101,
				sourceDate: "2026-03-08",
				targetDate: "2026-11-01",
				expectedRevision: "a".repeat(64),
			}).success,
		).toBe(true);
		expect(
			fulfillmentScheduleMoveSchema.safeParse({
				requestId: "11111111-1111-4111-8111-111111111111",
				salesOrderId: 101,
				dispatchId: 22,
				sourceDate: null,
				targetDate: "2026-02-31",
				expectedRevision: "a".repeat(64),
			}).success,
		).toBe(false);
		const stored = scheduleMoveDate("2026-03-08");
		expect(stored.toISOString()).toBe("2026-03-08T12:00:00.000Z");
		expect(scheduleBusinessDate(stored)).toBe("2026-03-08");
	});
});

describe("schedule move capabilities", () => {
	it("keeps worker Production calendars read-only and locks mixed completion", () => {
		expect(
			resolveProductionScheduleMoveCapability({
				authorized: true,
				workerMode: true,
				assignments: [{ completedAt: null }],
				pipeline: snapshot(),
			}),
		).toEqual({
			canReschedule: false,
			lockReason: "WORKER_CALENDAR_READ_ONLY",
		});
		expect(
			resolveProductionScheduleMoveCapability({
				authorized: true,
				assignments: [{ completedAt: null }, { completedAt: new Date() }],
				pipeline: snapshot(),
			}),
		).toEqual({
			canReschedule: false,
			lockReason: "PRODUCTION_GROUP_COMPLETED",
		});
	});

	it("allows only pre-trip Fulfillment and locks in-transit work", () => {
		expect(
			resolveFulfillmentScheduleMoveCapability({
				authorized: true,
				dispatch: { status: "packed" },
				pipeline: snapshot({ dispatchStatus: "packed" }),
			}),
		).toEqual({ canReschedule: true, lockReason: null });
		expect(
			resolveFulfillmentScheduleMoveCapability({
				authorized: true,
				dispatch: { status: "in progress" },
				pipeline: snapshot({ dispatchStatus: "in progress" }),
			}),
		).toEqual({
			canReschedule: false,
			lockReason: "DISPATCH_IN_PROGRESS",
		});
	});

	it("fails closed for unauthorized, deleted, cancelled, terminal, and conflicting work", () => {
		expect(
			resolveProductionScheduleMoveCapability({
				authorized: false,
				assignments: [{ completedAt: null }],
				pipeline: snapshot(),
			}),
		).toEqual({ canReschedule: false, lockReason: "PERMISSION_DENIED" });
		expect(
			resolveFulfillmentScheduleMoveCapability({
				authorized: true,
				dispatch: { status: "queue", deletedAt: new Date() },
				pipeline: snapshot({ dispatchStatus: "queue" }),
			}),
		).toEqual({ canReschedule: false, lockReason: "DISPATCH_DELETED" });
		expect(
			resolveFulfillmentScheduleMoveCapability({
				authorized: true,
				dispatch: { status: "cancelled" },
				pipeline: snapshot(),
			}),
		).toEqual({ canReschedule: false, lockReason: "DISPATCH_CANCELLED" });
		expect(
			resolveFulfillmentScheduleMoveCapability({
				authorized: true,
				dispatch: { status: "completed", deliveredAt: new Date() },
				pipeline: snapshot({ dispatchStatus: "completed" }),
			}),
		).toEqual({ canReschedule: false, lockReason: "DISPATCH_COMPLETED" });
	});
});

describe("schedule move persistence", () => {
	it("moves only the exact Production source-date group and replays once", async () => {
		const harness = commandHarness();
		const input = {
			requestId: "11111111-1111-4111-8111-111111111111",
			salesOrderId: 101,
			sourceDate: "2026-09-04",
			targetDate: "2026-09-06",
			expectedRevision: snapshot().revision,
		};
		const first = await moveProductionScheduleGroup(
			harness.db,
			input,
			{ id: 5, name: "Admin" },
			harness.dependencies,
		);
		expect(first).toMatchObject({
			kind: "production",
			affectedRecordCount: 1,
			assignmentIds: [11],
			workerIds: [7],
			idempotentReplay: false,
		});
		expect(harness.productionUpdate).toHaveBeenCalledWith({
			where: expect.objectContaining({
				id: { in: [11] },
				orderId: 101,
				deletedAt: null,
				completedAt: null,
			}),
			data: { dueDate: new Date("2026-09-06T12:00:00.000Z") },
		});
		const replay = await moveProductionScheduleGroup(
			harness.db,
			input,
			{ id: 5, name: "Admin" },
			harness.dependencies,
		);
		expect(replay.idempotentReplay).toBe(true);
		expect(harness.productionUpdate).toHaveBeenCalledTimes(1);
		const audit = harness.history.get(input.requestId);
		expect(audit?.name).toBe("Production schedule moved");
		expect(audit?.data).toMatchObject({
			requestId: input.requestId,
			actorId: 5,
			sourceDate: "2026-09-04",
			targetDate: "2026-09-06",
		});
		await expect(
			moveProductionScheduleGroup(
				harness.db,
				{ ...input, targetDate: "2026-09-08" },
				{ id: 5, name: "Admin" },
				harness.dependencies,
			),
		).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
	});

	it("moves one pre-trip Fulfillment record and rejects same-date writes", async () => {
		const current = snapshot({ dispatchStatus: "queue" });
		const harness = commandHarness(current);
		const input = {
			requestId: "22222222-2222-4222-8222-222222222222",
			salesOrderId: 101,
			dispatchId: 22,
			sourceDate: "2026-09-04",
			targetDate: "2026-09-07",
			expectedRevision: current.revision,
		};
		const result = await moveFulfillmentSchedule(
			harness.db,
			input,
			{ id: 5, name: "Admin" },
			harness.dependencies,
		);
		expect(result).toMatchObject({
			kind: "fulfillment",
			dispatchId: 22,
			driverId: 9,
			affectedRecordCount: 1,
		});
		expect(harness.fulfillmentUpdate).toHaveBeenCalledTimes(1);
		await expect(
			moveFulfillmentSchedule(
				harness.db,
				{
					...input,
					requestId: "33333333-3333-4333-8333-333333333333",
					targetDate: input.sourceDate,
				},
				{ id: 5, name: "Admin" },
				harness.dependencies,
			),
		).rejects.toBeInstanceOf(SalesScheduleMoveError);
	});

	it("rejects stale evidence, stale source dates, and concurrent writes", async () => {
		const current = snapshot({ dispatchStatus: "queue" });
		const stale = commandHarness(current);
		await expect(
			moveProductionScheduleGroup(
				stale.db,
				{
					requestId: "44444444-4444-4444-8444-444444444444",
					salesOrderId: 101,
					sourceDate: "2026-09-04",
					targetDate: "2026-09-08",
					expectedRevision: "f".repeat(64),
				},
				{ id: 5, name: "Admin" },
				stale.dependencies,
			),
		).rejects.toMatchObject({ code: "STALE_REVISION" });

		const staleSource = commandHarness(current);
		staleSource.fulfillmentFind.mockImplementation(async () => ({
			id: 22,
			salesOrderId: 101,
			status: "queue",
			dueDate: new Date("2026-09-05T12:00:00.000Z"),
			deliveredAt: null,
			deletedAt: null,
			driverId: 9,
			deliveryMode: "delivery",
		}));
		await expect(
			moveFulfillmentSchedule(
				staleSource.db,
				{
					requestId: "55555555-5555-4555-8555-555555555555",
					salesOrderId: 101,
					dispatchId: 22,
					sourceDate: "2026-09-04",
					targetDate: "2026-09-08",
					expectedRevision: current.revision,
				},
				{ id: 5, name: "Admin" },
				staleSource.dependencies,
			),
		).rejects.toMatchObject({ code: "STALE_SOURCE_DATE" });

		const concurrent = commandHarness();
		concurrent.productionUpdate.mockImplementation(async () => ({ count: 0 }));
		await expect(
			moveProductionScheduleGroup(
				concurrent.db,
				{
					requestId: "66666666-6666-4666-8666-666666666666",
					salesOrderId: 101,
					sourceDate: "2026-09-04",
					targetDate: "2026-09-08",
					expectedRevision: snapshot().revision,
				},
				{ id: 5, name: "Admin" },
				concurrent.dependencies,
			),
		).rejects.toMatchObject({ code: "CONCURRENT_UPDATE" });
	});
});
