import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

import type { Database } from "@gnd/db";

import {
	SalesCompletionError,
	type SalesCompletionRecordView,
	buildSalesCompletionActiveKey,
	buildSalesCompletionSatisfactionWhere,
	cancelFulfillmentCompletionStatusOnly,
	cancelFullWorkflowCompletionInTransaction,
	cancelProductionCompletionStatusOnly,
	getSalesCompletionProjection,
	hasCanonicalSalesFulfillmentEvidence,
	markFulfillmentCompletionStatusOnly,
	markFulfillmentCompletionStatusOnlyBulk,
	markProductionCompletionStatusOnly,
	markProductionCompletionStatusOnlyBulk,
	markSalesCompletionStatusOnlyBulkSchema,
	recordFullWorkflowCompletionIfProven,
	resolveSalesCompletionProjection,
	resolveSalesCompletionProjectionFromOrder,
	salesCompletionLabels,
	salesCompletionProjectionSourceRevision,
} from "./sales-completion";
import { resolveSalesPipelineSnapshotFromOrder } from "./sales-pipeline-order";

const recordedAt = new Date("2026-08-01T12:00:00.000Z");
const updatedAt = new Date("2026-08-01T12:00:00.000Z");

function completionRecord(
	overrides: Partial<SalesCompletionRecordView> = {},
): SalesCompletionRecordView {
	return {
		id: "completion-1",
		requestId: "00000000-0000-4000-8000-000000000001",
		cancellationRequestId: null,
		salesOrderId: 91,
		milestone: "PRODUCTION_COMPLETED",
		completionMethod: "STATUS_ONLY",
		state: "ACTIVE",
		effectiveAt: null,
		recordedAt,
		recordedBy: { id: 7, name: "Admin" },
		cancelledAt: null,
		cancelledBy: null,
		cancellationReason: null,
		updatedAt,
		...overrides,
	};
}

function createdSalesHistoryData(entry: unknown) {
	const payload = entry as {
		data?: { data?: Record<string, unknown> | null };
	};
	return { data: payload.data?.data ?? null };
}

function resolve(
	overrides: Partial<
		Parameters<typeof resolveSalesCompletionProjection>[0]
	> = {},
) {
	return resolveSalesCompletionProjection({
		salesOrderId: 91,
		orderNo: "091LRG",
		orderCreatedAt: new Date("2026-07-01T00:00:00.000Z"),
		orderUpdatedAt: updatedAt,
		orderStatus: null,
		legacyProductionStatus: null,
		operationalProductionCompleted: false,
		canonicalFulfilled: false,
		isCancelled: false,
		records: [],
		now: new Date("2026-09-01T00:00:00.000Z"),
		...overrides,
	});
}

describe("sales completion projection", () => {
	test("resolves order rows once and labels status-only completion explicitly", () => {
		const projection = resolveSalesCompletionProjectionFromOrder({
			id: 91,
			orderId: "091LRG",
			createdAt: new Date("2026-07-01T00:00:00.000Z"),
			updatedAt,
			status: null,
			prodStatus: null,
			stat: [],
			deliveries: [],
			completionRecords: [completionRecord()],
		});
		expect(projection.productionCompletionSatisfied).toBe(true);
		expect(projection.operationalProductionCompleted).toBe(false);
		expect(salesCompletionLabels(projection).production).toBe(
			"Completed — status only",
		);
	});

	test("uses the latest completion record revision for persisted projection freshness", () => {
		expect(
			salesCompletionProjectionSourceRevision({
				createdAt: new Date("2026-08-01T00:00:00.000Z"),
				updatedAt: new Date("2026-08-02T00:00:00.000Z"),
				completionRecords: [
					{ updatedAt: new Date("2026-08-03T00:00:00.000Z") },
				],
			}),
		).toEqual(new Date("2026-08-03T00:00:00.000Z"));
	});

	test("builds explicit completion predicates without changing operational filters", () => {
		const completed = buildSalesCompletionSatisfactionWhere(
			"FULFILLMENT_COMPLETED",
			true,
		);
		expect(completed).toMatchObject({
			OR: expect.arrayContaining([
				{
					completionRecords: {
						some: {
							state: "ACTIVE",
							completionMethod: "STATUS_ONLY",
							milestone: { in: ["FULFILLMENT_COMPLETED"] },
						},
					},
				},
			]),
		});
		const production = buildSalesCompletionSatisfactionWhere(
			"PRODUCTION_COMPLETED",
			true,
		);
		const serializedProduction = JSON.stringify(production);
		expect(serializedProduction).toContain('"assignments"');
		expect(serializedProduction).toContain('"completedAt":null');
		expect(serializedProduction).not.toContain('"prodStatus"');
		expect(serializedProduction).not.toContain('"type":"prodCompleted"');
		expect(
			buildSalesCompletionSatisfactionWhere("FULFILLMENT_COMPLETED", false),
		).toEqual({ NOT: completed });
	});
	test("requires completed dispatch proof instead of legacy terminal status", () => {
		expect(
			hasCanonicalSalesFulfillmentEvidence([
				{
					status: "completed",
					meta: { dispatchCompletion: { status: "uploading" } },
					_count: { items: 1 },
				},
			]),
		).toBe(false);
		expect(
			hasCanonicalSalesFulfillmentEvidence([
				{
					status: "fulfilled",
					meta: { dispatchCompletion: { status: "completed" } },
					_count: { items: 1 },
				},
			]),
		).toBe(false);
	});

	test("accepts completed proof on the committed dispatch boundary", () => {
		expect(
			hasCanonicalSalesFulfillmentEvidence([
				{
					status: "completed",
					meta: { dispatchCompletion: { status: "completed" } },
					_count: { items: 1 },
				},
			]),
		).toBe(true);
	});

	test("requires proof and completion for every item-bearing split dispatch", () => {
		expect(
			hasCanonicalSalesFulfillmentEvidence([
				{
					status: "completed",
					meta: { dispatchCompletion: { status: "completed" } },
					_count: { items: 1 },
				},
				{
					status: "in progress",
					meta: { dispatchCompletion: { status: "uploading" } },
					_count: { items: 1 },
				},
			]),
		).toBe(false);
	});

	test("does not let a legacy terminal order string manufacture canonical or Production evidence", async () => {
		const fixture = createCompletionDb([], { status: "fulfilled" });
		const projection = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});

		expect(projection.canonicalFulfilled).toBe(false);
		expect(projection.operationalProductionCompleted).toBe(false);
		expect(projection.productionCompletionSatisfied).toBe(false);
	});

	test("loads completed dispatch proof as canonical fulfillment evidence", async () => {
		const fixture = createCompletionDb([], {
			status: "fulfilled",
			deliveries: [
				{
					status: "completed",
					meta: { dispatchCompletion: { status: "completed" } },
					_count: { items: 1 },
				},
			],
		});
		const projection = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});

		expect(projection.canonicalFulfilled).toBe(true);
		expect(projection.productionCompletionSatisfied).toBe(true);
		expect(projection.fulfillmentDisposition).toBe("FULFILLED");
	});

	test("keeps operational truth separate from a status-only Production declaration", () => {
		const effectiveAt = new Date("2026-06-15T09:30:00.000Z");
		const record = completionRecord({ effectiveAt });
		const projection = resolve({ records: [record] });

		expect(projection).toMatchObject({
			operationalProductionCompleted: false,
			canonicalFulfilled: false,
			productionCompletionSatisfied: true,
			fulfillmentCompletionSatisfied: false,
			productionCompletionSource: "STATUS_ONLY",
			productionCompletionMethod: "STATUS_ONLY",
			productionEffectiveAt: effectiveAt,
			productionRecordedAt: recordedAt,
			availableActions: {
				markProductionStatusOnly: false,
				cancelProductionStatusOnly: true,
			},
		});
	});

	test("does not invent an effective date when it is unknown", () => {
		const projection = resolve({ records: [completionRecord()] });
		expect(projection.productionEffectiveAt).toBeNull();
		expect(projection.productionRecordedAt).toEqual(recordedAt);
	});

	test("operational evidence wins presentation while retaining status-only history", () => {
		const record = completionRecord();
		const projection = resolve({
			records: [record],
			operationalProductionCompleted: true,
		});

		expect(projection.productionCompletionSource).toBe("OPERATIONAL_WORKFLOW");
		expect(projection.productionCompletionMethod).toBe("FULL_WORKFLOW");
		expect(projection.history).toEqual([record]);
	});

	test("represents Fulfillment implication without fabricating a Production record", () => {
		const fulfillment = completionRecord({
			id: "completion-fulfillment",
			milestone: "FULFILLMENT_COMPLETED",
		});
		const projection = resolve({ records: [fulfillment] });

		expect(projection.productionCompletionSatisfied).toBe(true);
		expect(projection.productionCompletionSource).toBe(
			"IMPLIED_BY_FULFILLMENT",
		);
		expect(projection.activeProductionRecord).toBeNull();
		expect(projection.fulfillmentDisposition).toBe(
			"ADMINISTRATIVELY_COMPLETED",
		);
	});

	test("locks Production cancellation while Fulfillment completion is active", () => {
		const projection = resolve({
			records: [
				completionRecord(),
				completionRecord({
					id: "completion-fulfillment",
					milestone: "FULFILLMENT_COMPLETED",
				}),
			],
		});

		expect(projection.availableActions.cancelProductionStatusOnly).toBe(false);
		expect(
			projection.availableActions.productionCancellationBlockedReason,
		).toContain("Cancel Fulfillment");
	});

	test("gives canonical evidence precedence without rewriting administrative history", () => {
		const fulfillment = completionRecord({
			id: "completion-fulfillment",
			milestone: "FULFILLMENT_COMPLETED",
		});
		const projection = resolve({
			records: [fulfillment],
			canonicalFulfilled: true,
		});

		expect(projection.fulfillmentDisposition).toBe("FULFILLED");
		expect(projection.fulfillmentCompletionSource).toBe("OPERATIONAL_WORKFLOW");
		expect(projection.history).toEqual([fulfillment]);
		expect(projection.availableActions.cancelFulfillmentStatusOnly).toBe(true);
	});
});

function createCompletionDb(
	initialRecords: SalesCompletionRecordView[] = [],
	orderOverrides: Record<string, unknown> = {},
) {
	const records = [...initialRecords];
	const calls: string[] = [];
	const history: unknown[] = [];
	const orderRow = () => ({
		id: 91,
		orderId: "091LRG",
		createdAt: new Date("2026-07-01T00:00:00.000Z"),
		updatedAt,
		status: null,
		prodStatus: null,
		stat: [],
		deliveries: [],
		itemControls: [
			{
				uid: "door-1",
				produceable: true,
				shippable: true,
				qtyControls: [
					{
						type: "qty",
						total: 1,
						itemTotal: null,
						qty: null,
						updatedAt,
					},
				],
			},
		],
		assignments: [],
		completionRecords: [...records].reverse(),
		...orderOverrides,
	});
	const tx = {
		salesOrders: {
			findFirst: mock(async () => {
				calls.push("salesOrders.findFirst");
				return orderRow();
			}),
		},
		salesCompletionRecord: {
			findUnique: mock(async ({ where }: { where: Record<string, string> }) => {
				calls.push("salesCompletionRecord.findUnique");
				if (where.requestId) {
					return (
						records.find((record) => record.requestId === where.requestId) ??
						null
					);
				}
				if (where.cancellationRequestId) {
					return (
						records.find(
							(record) =>
								record.cancellationRequestId === where.cancellationRequestId,
						) ?? null
					);
				}
				return (
					records.find(
						(record) =>
							record.state === "ACTIVE" &&
							buildSalesCompletionActiveKey({
								salesOrderId: record.salesOrderId,
								milestone: record.milestone,
							}) === where.activeKey,
					) ?? null
				);
			}),
			create: mock(async ({ data }: { data: Record<string, unknown> }) => {
				calls.push("salesCompletionRecord.create");
				const record = completionRecord({
					id: `completion-${records.length + 1}`,
					requestId: String(data.requestId),
					salesOrderId: Number(data.salesOrderId),
					milestone: data.milestone as SalesCompletionRecordView["milestone"],
					completionMethod:
						data.completionMethod as SalesCompletionRecordView["completionMethod"],
					effectiveAt: (data.effectiveAt as Date | null) ?? null,
					recordedAt: data.recordedAt as Date,
					recordedBy: { id: Number(data.recordedById), name: "Admin" },
					updatedAt: data.recordedAt as Date,
				});
				records.push(record);
				return record;
			}),
			update: mock(
				async ({
					where,
					data,
				}: {
					where: { id: string };
					data: Record<string, unknown>;
				}) => {
					calls.push("salesCompletionRecord.update");
					const record = records.find((candidate) => candidate.id === where.id);
					if (!record) throw new Error("missing record");
					Object.assign(record, {
						state: data.state,
						cancellationRequestId: data.cancellationRequestId,
						cancelledAt: data.cancelledAt,
						cancelledBy: { id: Number(data.cancelledById), name: "Admin" },
						cancellationReason: data.cancellationReason,
						updatedAt: data.cancelledAt,
					});
					return record;
				},
			),
		},
		salesHistory: {
			findMany: mock(async () => history.map(createdSalesHistoryData)),
			create: mock(async (payload: unknown) => {
				calls.push("salesHistory.create");
				history.push(payload);
				return payload;
			}),
		},
	};
	const db = {
		...tx,
		$transaction: mock(
			async (operation: (transaction: typeof tx) => Promise<unknown>) =>
				operation(tx),
		),
	};
	return { db: db as unknown as Database, tx, records, calls, history };
}

function createBulkCompletionDb(
	orderIds: number[],
	orderOverrides: Record<string, unknown> = {},
) {
	const records: SalesCompletionRecordView[] = [];
	const history: unknown[] = [];
	let activeTransactions = 0;
	let maxActiveTransactions = 0;
	const orderIdSet = new Set(orderIds);
	const orderRow = (salesOrderId: number) => ({
		id: salesOrderId,
		orderId: `ORDER-${salesOrderId}`,
		createdAt: new Date("2025-01-01T00:00:00.000Z"),
		updatedAt,
		status: null,
		prodStatus: null,
		stat: [],
		deliveries: [],
		itemControls: [
			{
				uid: `door-${salesOrderId}`,
				produceable: true,
				shippable: true,
				qtyControls: [
					{
						type: "qty",
						total: 1,
						itemTotal: null,
						qty: null,
						updatedAt,
					},
				],
			},
		],
		assignments: [],
		completionRecords: records
			.filter((record) => record.salesOrderId === salesOrderId)
			.toReversed(),
		...orderOverrides,
	});
	const tx = {
		salesOrders: {
			findFirst: mock(async ({ where }: { where: { id: number } }) =>
				orderIdSet.has(where.id) ? orderRow(where.id) : null,
			),
		},
		salesCompletionRecord: {
			findUnique: mock(async ({ where }: { where: Record<string, string> }) => {
				if (where.requestId) {
					return (
						records.find((record) => record.requestId === where.requestId) ??
						null
					);
				}
				return (
					records.find(
						(record) =>
							record.state === "ACTIVE" &&
							buildSalesCompletionActiveKey({
								salesOrderId: record.salesOrderId,
								milestone: record.milestone,
							}) === where.activeKey,
					) ?? null
				);
			}),
			create: mock(async ({ data }: { data: Record<string, unknown> }) => {
				const record = completionRecord({
					id: `completion-${records.length + 1}`,
					requestId: String(data.requestId),
					salesOrderId: Number(data.salesOrderId),
					milestone: data.milestone as SalesCompletionRecordView["milestone"],
					completionMethod: "STATUS_ONLY",
					effectiveAt: (data.effectiveAt as Date | null) ?? null,
					recordedAt: data.recordedAt as Date,
					recordedBy: { id: Number(data.recordedById), name: "Admin" },
					updatedAt: data.recordedAt as Date,
				});
				records.push(record);
				return record;
			}),
		},
		salesHistory: {
			findUnique: mock(async ({ where }: { where: { id: string } }) => {
				const entry = history.find(
					(entry) =>
						(entry as { data?: { id?: string } }).data?.id === where.id,
				);
				return entry ? createdSalesHistoryData(entry) : null;
			}),
			findMany: mock(async () => history.map(createdSalesHistoryData)),
			create: mock(async (payload: unknown) => {
				const id = (payload as { data?: { id?: string } }).data?.id;
				if (
					id &&
					history.some(
						(entry) => (entry as { data?: { id?: string } }).data?.id === id,
					)
				) {
					throw Object.assign(new Error("duplicate history identity"), {
						code: "P2002",
					});
				}
				history.push(payload);
				return payload;
			}),
		},
	};
	const db = {
		...tx,
		$transaction: mock(
			async (operation: (transaction: typeof tx) => Promise<unknown>) => {
				activeTransactions += 1;
				maxActiveTransactions = Math.max(
					maxActiveTransactions,
					activeTransactions,
				);
				try {
					return await operation(tx);
				} finally {
					activeTransactions -= 1;
				}
			},
		),
	};
	return {
		db: db as unknown as Database,
		records,
		history,
		maxActiveTransactions: () => maxActiveTransactions,
	};
}

describe("status-only completion batches", () => {
	test("bounds the batch contract to 100 selected orders", () => {
		expect(
			markSalesCompletionStatusOnlyBulkSchema.safeParse({
				salesOrderIds: Array.from({ length: 100 }, (_, index) => index + 1),
				requestId: "00000000-0000-4000-8000-000000000100",
				effectiveAt: null,
			}).success,
		).toBe(true);
		expect(
			markSalesCompletionStatusOnlyBulkSchema.safeParse({
				salesOrderIds: Array.from({ length: 101 }, (_, index) => index + 1),
				requestId: "00000000-0000-4000-8000-000000000101",
				effectiveAt: null,
			}).success,
		).toBe(false);
		expect(
			markSalesCompletionStatusOnlyBulkSchema.safeParse({
				salesOrderIds: [91],
				requestId: "00000000-0000-4000-8000-000000000102",
				administrativeOverride: {
					reason: "Manager reviewed the exception.",
					expectedRevisions: [
						{ salesOrderId: 91, revision: "a".repeat(64) },
						{ salesOrderId: 91, revision: "b".repeat(64) },
					],
				},
			}).success,
		).toBe(false);
	});

	test("marks unique Production orders and replays the same batch idempotently", async () => {
		const fixture = createBulkCompletionDb([91, 92]);
		const input = {
			salesOrderIds: [91, 92, 91],
			requestId: "00000000-0000-4000-8000-000000000201",
			effectiveAt: null,
		};

		const first = await markProductionCompletionStatusOnlyBulk(
			fixture.db,
			input,
			{ id: 7, name: "Admin" },
		);
		const replay = await markProductionCompletionStatusOnlyBulk(
			fixture.db,
			input,
			{ id: 7, name: "Admin" },
		);

		expect(first).toMatchObject({
			requested: 2,
			completed: 2,
			replayed: 0,
			skipped: 0,
			failed: 0,
		});
		expect(replay).toMatchObject({
			requested: 2,
			completed: 0,
			replayed: 2,
			skipped: 0,
			failed: 0,
		});
		expect(fixture.records).toHaveLength(2);
		expect(fixture.history).toHaveLength(3);
	});

	test("rejects a changed batch payload under the same request", async () => {
		const fixture = createBulkCompletionDb([91]);
		const input = {
			salesOrderIds: [91],
			requestId: "00000000-0000-4000-8000-000000000205",
			effectiveAt: null,
		};

		const first = await markProductionCompletionStatusOnlyBulk(
			fixture.db,
			input,
			{ id: 7, name: "Admin" },
		);
		expect(first.completed).toBe(1);
		await expect(
			markProductionCompletionStatusOnlyBulk(
				fixture.db,
				{
					...input,
					effectiveAt: new Date("2026-09-03T12:00:00.000Z"),
				},
				{ id: 7, name: "Admin" },
			),
		).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(2);
	});

	test("binds the batch request to its complete order membership", async () => {
		const fixture = createBulkCompletionDb([91, 92]);
		const requestId = "00000000-0000-4000-8000-000000000206";

		const first = await markProductionCompletionStatusOnlyBulk(
			fixture.db,
			{ salesOrderIds: [91], requestId, effectiveAt: null },
			{ id: 7, name: "Admin" },
		);

		expect(first.completed).toBe(1);
		await expect(
			markProductionCompletionStatusOnlyBulk(
				fixture.db,
				{ salesOrderIds: [92], requestId, effectiveAt: null },
				{ id: 7, name: "Admin" },
			),
		).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
		expect(fixture.records).toHaveLength(1);
		expect(fixture.records[0]?.salesOrderId).toBe(91);
	});

	test("isolates missing Fulfillment orders while completing valid selections", async () => {
		const fixture = createBulkCompletionDb([91]);
		const result = await markFulfillmentCompletionStatusOnlyBulk(
			fixture.db,
			{
				salesOrderIds: [91, 999],
				requestId: "00000000-0000-4000-8000-000000000202",
				effectiveAt: null,
			},
			{ id: 7, name: "Admin" },
		);

		expect(result).toMatchObject({
			requested: 2,
			completed: 1,
			replayed: 0,
			skipped: 0,
			failed: 1,
		});
		expect(result.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ salesOrderId: 91, status: "completed" }),
				expect.objectContaining({
					salesOrderId: 999,
					status: "failed",
					code: "NOT_FOUND",
				}),
			]),
		);
	});

	test("serializes status-only writes to avoid MySQL range-lock conflicts", async () => {
		const fixture = createBulkCompletionDb([91, 92, 93, 94, 95]);
		const result = await markFulfillmentCompletionStatusOnlyBulk(
			fixture.db,
			{
				salesOrderIds: [91, 92, 93, 94, 95],
				requestId: "00000000-0000-4000-8000-000000000203",
				effectiveAt: null,
			},
			{ id: 7, name: "Admin" },
		);

		expect(result.completed).toBe(5);
		expect(result.failed).toBe(0);
		expect(fixture.maxActiveTransactions()).toBe(1);
	});

	test("applies one audited override reason with a revision for every selected exception", async () => {
		const fixture = createBulkCompletionDb([91, 92], { itemControls: [] });
		const expectedRevisions = await Promise.all(
			[91, 92].map(async (salesOrderId) => {
				const order = await fixture.db.salesOrders.findFirst({
					where: { id: salesOrderId },
				});
				return {
					salesOrderId,
					revision: resolveSalesPipelineSnapshotFromOrder(order as never)
						.revision,
				};
			}),
		);
		const firstExpectedRevision = expectedRevisions[0];
		const secondExpectedRevision = expectedRevisions[1];
		if (!firstExpectedRevision || !secondExpectedRevision) {
			throw new Error("Expected two batch revision fixtures.");
		}

		const result = await markProductionCompletionStatusOnlyBulk(
			fixture.db,
			{
				salesOrderIds: [91, 92],
				requestId: "00000000-0000-4000-8000-000000000204",
				effectiveAt: null,
				administrativeOverride: {
					reason: "Manager confirmed external completion.",
					expectedRevisions,
				},
			},
			{ id: 7, name: "Admin" },
		);

		expect(result.completed).toBe(2);
		expect(fixture.history).toHaveLength(3);
		expect(fixture.history).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					data: expect.objectContaining({
						data: expect.objectContaining({
							administrativeOverride: expect.objectContaining({
								reason: "Manager confirmed external completion.",
							}),
						}),
					}),
				}),
			]),
		);
		await expect(
			markProductionCompletionStatusOnlyBulk(
				fixture.db,
				{
					salesOrderIds: [91, 92],
					requestId: "00000000-0000-4000-8000-000000000204",
					effectiveAt: null,
					administrativeOverride: {
						reason: "Manager confirmed external completion.",
						expectedRevisions: [
							{ ...firstExpectedRevision, revision: "a".repeat(64) },
							secondExpectedRevision,
						],
					},
				},
				{ id: 7, name: "Admin" },
			),
		).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
	});
});

describe("status-only Production commands", () => {
	test("lets a canonical Status unavailable override supersede an already-satisfied legacy Production projection", async () => {
		const fixture = createCompletionDb([], {
			stat: [
				{
					type: "prodCompleted",
					percentage: 100,
					score: 1,
					total: 1,
				},
			],
			itemControls: [],
		});
		const order = await fixture.tx.salesOrders.findFirst({});
		const pipeline = resolveSalesPipelineSnapshotFromOrder(order as never);
		const completion = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});

		expect(pipeline.headline.code).toBe("unknown");
		expect(completion.productionCompletionSatisfied).toBe(true);
		expect(completion.availableActions.markProductionStatusOnly).toBe(false);

		const result = await markProductionCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000114",
				expectedRevision: completion.revision,
				effectiveAt: null,
				administrativeOverride: {
					reason: "Manager resolved the unavailable canonical lifecycle.",
					expectedRevision: pipeline.revision,
				},
			},
			{ id: 7, name: "Admin" },
		);

		expect(result.idempotentReplay).toBe(false);
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(1);
	});

	test("records an explicit conflict override reason and prior canonical snapshot", async () => {
		const fixture = createCompletionDb([], {
			archivedAt: null,
			deletedAt: null,
			grandTotal: 100,
			amountDue: 0,
			inventoryProjection: null,
			itemControls: [
				{
					uid: "door-1",
					produceable: false,
					shippable: true,
					qtyControls: [
						{
							type: "qty",
							total: 1,
							itemTotal: null,
							qty: null,
							updatedAt,
						},
					],
				},
			],
			assignments: [
				{
					id: 901,
					assignedToId: 7,
					qtyAssigned: 1,
					qtyCompleted: 0,
					lhQty: 0,
					rhQty: 0,
					dueDate: new Date("2026-09-02T00:00:00.000Z"),
					assignedAt: updatedAt,
					completedAt: null,
					updatedAt,
					submissions: [],
				},
			],
		});
		const order = await fixture.tx.salesOrders.findFirst({});
		const pipeline = resolveSalesPipelineSnapshotFromOrder(order as never);
		const completion = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});

		const result = await markProductionCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000010",
				expectedRevision: completion.revision,
				effectiveAt: null,
				administrativeOverride: {
					reason: "Manager verified the external Production record.",
					expectedRevision: pipeline.revision,
				},
			},
			{ id: 7, name: "Admin" },
		);

		expect(result.projection.productionCompletionSatisfied).toBe(true);
		expect(fixture.history).toHaveLength(1);
		expect(fixture.history[0]).toMatchObject({
			data: {
				data: {
					administrativeOverride: {
						reason: "Manager verified the external Production record.",
						expectedRevision: pipeline.revision,
						priorSnapshot: {
							revision: pipeline.revision,
							headline: { code: "conflict" },
						},
						resultingSnapshot: {
							headline: { code: "administratively_completed" },
							production: { state: "administratively_completed" },
						},
					},
				},
			},
		});
	});

	test("marks only the completion record and audit in one serializable transaction", async () => {
		const fixture = createCompletionDb();
		const before = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});
		fixture.calls.length = 0;

		const result = await markProductionCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000011",
				expectedRevision: before.revision,
				effectiveAt: null,
			},
			{ id: 7, name: "Admin" },
		);

		expect(result.idempotentReplay).toBe(false);
		expect(result.projection.productionCompletionSatisfied).toBe(true);
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(1);
		expect(fixture.calls).toContain("salesCompletionRecord.create");
		expect(fixture.calls).toContain("salesHistory.create");
		expect(Object.keys(fixture.tx).sort()).toEqual([
			"salesCompletionRecord",
			"salesHistory",
			"salesOrders",
		]);
		expect(fixture.db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
			isolationLevel: "Serializable",
		});
	});

	test("refreshes the lifecycle list projection inside the completion transaction", async () => {
		const fixture = createCompletionDb();
		const before = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});
		const refreshListProjection = mock(
			async (db: unknown, salesOrderId: number) => {
				expect(db).toBe(fixture.tx);
				expect(salesOrderId).toBe(91);
			},
		);

		await markProductionCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000113",
				expectedRevision: before.revision,
				effectiveAt: null,
			},
			{ id: 7, name: "Admin" },
			{ refreshListProjection: refreshListProjection as never },
		);

		expect(refreshListProjection).toHaveBeenCalledTimes(1);
		expect(fixture.calls.indexOf("salesHistory.create")).toBeGreaterThan(-1);
	});

	test("replays a duplicate mark without a second record or audit", async () => {
		const fixture = createCompletionDb();
		const before = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});
		const input = {
			salesOrderId: 91,
			requestId: "00000000-0000-4000-8000-000000000012",
			expectedRevision: before.revision,
			effectiveAt: null,
		};

		await markProductionCompletionStatusOnly(fixture.db, input, {
			id: 7,
			name: "Admin",
		});
		const replay = await markProductionCompletionStatusOnly(fixture.db, input, {
			id: 7,
			name: "Admin",
		});

		expect(replay.idempotentReplay).toBe(true);
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(1);
	});

	test("rejects a reused mark request when the administrative payload changes", async () => {
		const fixture = createCompletionDb([], { itemControls: [] });
		const order = await fixture.tx.salesOrders.findFirst({});
		const pipeline = resolveSalesPipelineSnapshotFromOrder(order as never);
		const completion = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});
		const input = {
			salesOrderId: 91,
			requestId: "00000000-0000-4000-8000-000000000112",
			expectedRevision: completion.revision,
			effectiveAt: null,
			administrativeOverride: {
				reason: "Manager verified external completion.",
				expectedRevision: pipeline.revision,
			},
		};

		await markProductionCompletionStatusOnly(fixture.db, input, {
			id: 7,
			name: "Admin",
		});
		await expect(
			markProductionCompletionStatusOnly(
				fixture.db,
				{
					...input,
					administrativeOverride: {
						...input.administrativeOverride,
						reason: "A different administrative reason.",
					},
				},
				{ id: 7, name: "Admin" },
			),
		).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(1);
	});

	test("returns a distinct stale-state error before writes", async () => {
		const fixture = createCompletionDb();
		const promise = markProductionCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000013",
				expectedRevision: "0".repeat(64),
				effectiveAt: null,
			},
			{ id: 7, name: "Admin" },
		);

		await expect(promise).rejects.toMatchObject({
			code: "STALE_STATE",
		});
		expect(fixture.records).toHaveLength(0);
		expect(fixture.history).toHaveLength(0);
	});

	test("rejects an administrative override when the canonical pipeline revision is stale", async () => {
		const fixture = createCompletionDb();
		const completion = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});

		await expect(
			markProductionCompletionStatusOnly(
				fixture.db,
				{
					salesOrderId: 91,
					requestId: "00000000-0000-4000-8000-000000000018",
					expectedRevision: completion.revision,
					effectiveAt: null,
					administrativeOverride: {
						reason: "Manager confirmed external completion.",
						expectedRevision: "0".repeat(64),
					},
				},
				{ id: 7, name: "Admin" },
			),
		).rejects.toMatchObject({ code: "STALE_STATE" });
		expect(fixture.records).toHaveLength(0);
		expect(fixture.history).toHaveLength(0);
	});

	test("treats an active-record unique race as an idempotent success", async () => {
		const active = completionRecord({
			requestId: "00000000-0000-4000-8000-000000000099",
		});
		const fixture = createCompletionDb([active]);
		fixture.db.$transaction = mock(async () => {
			throw Object.assign(new Error("duplicate"), { code: "P2002" });
		}) as never;

		const result = await markProductionCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000014",
				expectedRevision: "0".repeat(64),
				effectiveAt: null,
			},
			{ id: 7, name: "Admin" },
		);

		expect(result.idempotentReplay).toBe(true);
		expect(result.record.id).toBe(active.id);
	});

	test("cancels without business reversals and preserves the record", async () => {
		const active = completionRecord();
		const fixture = createCompletionDb([active]);
		const before = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});
		fixture.calls.length = 0;

		const result = await cancelProductionCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000015",
				expectedRevision: before.revision,
				reason: "Historical correction",
			},
			{ id: 7, name: "Admin" },
		);

		expect(result.record).toMatchObject({
			id: active.id,
			state: "CANCELLED",
			cancellationReason: "Historical correction",
		});
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(1);
		expect(fixture.calls).toContain("salesCompletionRecord.update");
		expect(fixture.calls).toContain("salesHistory.create");
	});

	test("rejects Production cancellation while Fulfillment remains active", async () => {
		const fixture = createCompletionDb([
			completionRecord(),
			completionRecord({
				id: "completion-fulfillment",
				requestId: "00000000-0000-4000-8000-000000000002",
				milestone: "FULFILLMENT_COMPLETED",
			}),
		]);
		const before = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});

		const promise = cancelProductionCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000016",
				expectedRevision: before.revision,
				reason: null,
			},
			{ id: 7, name: "Admin" },
		);

		await expect(promise).rejects.toMatchObject({
			code: "INVALID_TRANSITION",
		});
		expect(fixture.records.every((record) => record.state === "ACTIVE")).toBe(
			true,
		);
	});

	test("requires workflow-aware cancellation for Full workflow provenance", async () => {
		const fixture = createCompletionDb([
			completionRecord({ completionMethod: "FULL_WORKFLOW" }),
		]);
		const before = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});

		await expect(
			cancelProductionCompletionStatusOnly(
				fixture.db,
				{
					salesOrderId: 91,
					requestId: "00000000-0000-4000-8000-000000000017",
					expectedRevision: before.revision,
					reason: null,
				},
				{ id: 7, name: "Admin" },
			),
		).rejects.toBeInstanceOf(SalesCompletionError);
	});
});

describe("status-only Fulfillment commands", () => {
	test("lets a canonical lifecycle exception override supersede already-satisfied Fulfillment evidence", async () => {
		const fixture = createCompletionDb([], {
			itemControls: [
				{
					uid: "non-shippable-1",
					produceable: false,
					shippable: false,
					qtyControls: [
						{
							type: "qty",
							total: 1,
							itemTotal: null,
							qty: null,
							updatedAt,
						},
					],
				},
			],
			deliveries: [
				{
					id: 901,
					status: "completed",
					meta: {
						dispatchCompletion: { status: "completed" },
						inventoryDispatch: { status: "consumed" },
					},
					dueDate: null,
					driverId: 7,
					updatedAt,
					items: [{ id: 901, qty: 1, updatedAt }],
					_count: { items: 1, stockAllocations: 1 },
				},
			],
		});
		const order = await fixture.tx.salesOrders.findFirst({});
		const pipeline = resolveSalesPipelineSnapshotFromOrder(order as never);
		const completion = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});

		expect(["unknown", "conflict"]).toContain(pipeline.headline.code);
		expect(completion.fulfillmentCompletionSatisfied).toBe(true);
		expect(completion.availableActions.markFulfillmentStatusOnly).toBe(false);

		const result = await markFulfillmentCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000115",
				expectedRevision: completion.revision,
				effectiveAt: null,
				administrativeOverride: {
					reason: "Manager resolved the exceptional canonical lifecycle.",
					expectedRevision: pipeline.revision,
				},
			},
			{ id: 7, name: "Admin" },
		);

		expect(result.idempotentReplay).toBe(false);
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(1);
	});

	test("records the same explicit exception provenance for Fulfillment", async () => {
		const fixture = createCompletionDb([], { itemControls: [] });
		const order = await fixture.tx.salesOrders.findFirst({});
		const pipeline = resolveSalesPipelineSnapshotFromOrder(order as never);
		const completion = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});

		await markFulfillmentCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000020",
				expectedRevision: completion.revision,
				effectiveAt: null,
				administrativeOverride: {
					reason: "Manager verified external fulfillment.",
					expectedRevision: pipeline.revision,
				},
			},
			{ id: 7, name: "Admin" },
		);

		expect(fixture.history[0]).toMatchObject({
			data: {
				data: {
					administrativeOverride: {
						reason: "Manager verified external fulfillment.",
						expectedRevision: pipeline.revision,
						priorSnapshot: { headline: { code: "unknown" } },
						resultingSnapshot: {
							headline: { code: "administratively_completed" },
							fulfillment: { state: "administratively_completed" },
						},
					},
				},
			},
		});
	});

	test("marks only Fulfillment completion and audit while implying Production", async () => {
		const fixture = createCompletionDb();
		const before = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});
		fixture.calls.length = 0;

		const result = await markFulfillmentCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000021",
				expectedRevision: before.revision,
				effectiveAt: null,
			},
			{ id: 7, name: "Admin" },
		);

		expect(result.idempotentReplay).toBe(false);
		expect(result.record.milestone).toBe("FULFILLMENT_COMPLETED");
		expect(result.projection).toMatchObject({
			canonicalFulfilled: false,
			fulfillmentCompletionSatisfied: true,
			fulfillmentDisposition: "ADMINISTRATIVELY_COMPLETED",
			productionCompletionSatisfied: true,
			productionCompletionSource: "IMPLIED_BY_FULFILLMENT",
			activeProductionRecord: null,
		});
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(1);
		expect(Object.keys(fixture.tx).sort()).toEqual([
			"salesCompletionRecord",
			"salesHistory",
			"salesOrders",
		]);
	});

	test("replays duplicate Fulfillment marks without a second record or audit", async () => {
		const fixture = createCompletionDb();
		const before = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});
		const input = {
			salesOrderId: 91,
			requestId: "00000000-0000-4000-8000-000000000022",
			expectedRevision: before.revision,
			effectiveAt: null,
		};

		await markFulfillmentCompletionStatusOnly(fixture.db, input, {
			id: 7,
			name: "Admin",
		});
		const replay = await markFulfillmentCompletionStatusOnly(
			fixture.db,
			input,
			{ id: 7, name: "Admin" },
		);

		expect(replay.idempotentReplay).toBe(true);
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(1);
	});

	test("treats a concurrent active Fulfillment record as an idempotent success", async () => {
		const active = completionRecord({
			id: "completion-fulfillment",
			requestId: "00000000-0000-4000-8000-000000000098",
			milestone: "FULFILLMENT_COMPLETED",
		});
		const fixture = createCompletionDb([active]);
		fixture.db.$transaction = mock(async () => {
			throw Object.assign(new Error("duplicate"), { code: "P2002" });
		}) as never;

		const result = await markFulfillmentCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000023",
				expectedRevision: "0".repeat(64),
				effectiveAt: null,
			},
			{ id: 7, name: "Admin" },
		);

		expect(result.idempotentReplay).toBe(true);
		expect(result.record.id).toBe(active.id);
	});

	test("cancelling Fulfillment restores an explicit Production declaration", async () => {
		const production = completionRecord();
		const fulfillment = completionRecord({
			id: "completion-fulfillment",
			requestId: "00000000-0000-4000-8000-000000000024",
			milestone: "FULFILLMENT_COMPLETED",
		});
		const fixture = createCompletionDb([production, fulfillment]);
		const before = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});

		const result = await cancelFulfillmentCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000025",
				expectedRevision: before.revision,
				reason: "Correct the historical declaration",
			},
			{ id: 7, name: "Admin" },
		);

		expect(result.record.state).toBe("CANCELLED");
		expect(result.projection).toMatchObject({
			fulfillmentCompletionSatisfied: false,
			fulfillmentDisposition: "PENDING",
			productionCompletionSatisfied: true,
			productionCompletionSource: "STATUS_ONLY",
			activeProductionRecord: { id: production.id },
		});
		expect(fixture.records).toHaveLength(2);
		expect(fixture.history).toHaveLength(1);
	});

	test("cancelling Fulfillment returns to unresolved when no Production evidence remains", async () => {
		const fixture = createCompletionDb([
			completionRecord({
				id: "completion-fulfillment",
				milestone: "FULFILLMENT_COMPLETED",
			}),
		]);
		const before = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});

		const result = await cancelFulfillmentCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000026",
				expectedRevision: before.revision,
				reason: null,
			},
			{ id: 7, name: "Admin" },
		);

		expect(result.projection).toMatchObject({
			productionCompletionSatisfied: false,
			fulfillmentCompletionSatisfied: false,
			productionCompletionSource: "NONE",
			fulfillmentCompletionSource: "NONE",
		});
	});

	test("cancelling Fulfillment restores independent operational Production evidence", async () => {
		const fixture = createCompletionDb(
			[
				completionRecord({
					id: "completion-fulfillment",
					milestone: "FULFILLMENT_COMPLETED",
				}),
			],
			{
				stat: [{ type: "prodCompleted", percentage: 100, score: 1, total: 1 }],
			},
		);
		const before = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});

		const result = await cancelFulfillmentCompletionStatusOnly(
			fixture.db,
			{
				salesOrderId: 91,
				requestId: "00000000-0000-4000-8000-000000000027",
				expectedRevision: before.revision,
				reason: null,
			},
			{ id: 7, name: "Admin" },
		);

		expect(result.projection).toMatchObject({
			operationalProductionCompleted: true,
			productionCompletionSatisfied: true,
			productionCompletionSource: "OPERATIONAL_WORKFLOW",
			fulfillmentCompletionSatisfied: false,
		});
	});

	test("requires workflow-aware cancellation for Full workflow Fulfillment provenance", async () => {
		const fixture = createCompletionDb([
			completionRecord({
				id: "completion-fulfillment",
				milestone: "FULFILLMENT_COMPLETED",
				completionMethod: "FULL_WORKFLOW",
			}),
		]);
		const before = await getSalesCompletionProjection(fixture.db, {
			salesOrderId: 91,
		});

		await expect(
			cancelFulfillmentCompletionStatusOnly(
				fixture.db,
				{
					salesOrderId: 91,
					requestId: "00000000-0000-4000-8000-000000000028",
					expectedRevision: before.revision,
					reason: null,
				},
				{ id: 7, name: "Admin" },
			),
		).rejects.toMatchObject({ code: "METHOD_MISMATCH" });
	});
});

describe("full-workflow completion provenance", () => {
	test("schema migration creates provenance storage without inferring historical rows", () => {
		const migration = readFileSync(
			resolvePath(
				import.meta.dir,
				"../../db/src/migrations/20260901200350_add_sales_completion_record/migration.sql",
			),
			"utf8",
		);

		expect(migration).toContain("CREATE TABLE `SalesCompletionRecord`");
		expect(migration).not.toMatch(/INSERT\s+INTO\s+`?SalesCompletionRecord`?/i);
		expect(migration).not.toMatch(
			/UPDATE\s+`?(SalesOrders|SalesStat|QtyControl)`?/i,
		);
	});

	test("does not persist provenance until canonical operational evidence exists", async () => {
		const fixture = createCompletionDb([], {
			status: "fulfilled",
			prodStatus: "completed",
		});

		const result = await recordFullWorkflowCompletionIfProven(fixture.db, {
			salesOrderId: 91,
			milestone: "PRODUCTION_COMPLETED",
			actor: { id: 7, name: "Operator" },
		});

		expect(result).toMatchObject({
			recorded: false,
			idempotentReplay: false,
			reason: "EVIDENCE_NOT_PROVEN",
			record: null,
		});
		expect(fixture.records).toHaveLength(0);
		expect(fixture.history).toHaveLength(0);
	});

	test("records Production provenance after evidence and replays by active milestone", async () => {
		const fixture = createCompletionDb([], {
			stat: [{ type: "prodCompleted", percentage: 100, score: 1, total: 1 }],
		});
		const input = {
			salesOrderId: 91,
			milestone: "PRODUCTION_COMPLETED" as const,
			actor: { id: 7, name: "Operator" },
			requestId: "00000000-0000-4000-8000-000000000031",
		};

		const result = await recordFullWorkflowCompletionIfProven(
			fixture.db,
			input,
		);
		const replay = await recordFullWorkflowCompletionIfProven(
			fixture.db,
			input,
		);

		expect(result).toMatchObject({ recorded: true, reason: "RECORDED" });
		expect(result.record).toMatchObject({
			milestone: "PRODUCTION_COMPLETED",
			completionMethod: "FULL_WORKFLOW",
		});
		expect(replay).toMatchObject({
			recorded: true,
			idempotentReplay: true,
			reason: "ALREADY_RECORDED",
		});
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(1);
		expect(fixture.db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
			isolationLevel: "Serializable",
		});
	});

	test("treats a concurrent Full-workflow active-record race as a replay", async () => {
		const active = completionRecord({ completionMethod: "FULL_WORKFLOW" });
		const fixture = createCompletionDb([active], {
			stat: [{ type: "prodCompleted", percentage: 100, score: 1, total: 1 }],
		});
		fixture.db.$transaction = mock(async () => {
			throw Object.assign(new Error("duplicate"), { code: "P2002" });
		}) as never;

		const result = await recordFullWorkflowCompletionIfProven(fixture.db, {
			salesOrderId: 91,
			milestone: "PRODUCTION_COMPLETED",
			actor: { id: 7, name: "Operator" },
		});

		expect(result).toMatchObject({
			recorded: true,
			idempotentReplay: true,
			reason: "ALREADY_RECORDED",
			record: { id: active.id, completionMethod: "FULL_WORKFLOW" },
		});
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(0);
	});

	test("records Fulfillment provenance only from completed item-bearing dispatch proof", async () => {
		const fixture = createCompletionDb([], {
			deliveries: [
				{
					status: "completed",
					meta: { dispatchCompletion: { status: "completed" } },
					_count: { items: 1 },
				},
			],
		});

		const result = await recordFullWorkflowCompletionIfProven(fixture.db, {
			salesOrderId: 91,
			milestone: "FULFILLMENT_COMPLETED",
			actor: { id: 7, name: "Driver" },
			effectiveAt: new Date("2026-08-01T10:30:00.000Z"),
		});

		expect(result).toMatchObject({ recorded: true, reason: "RECORDED" });
		expect(result.record).toMatchObject({
			milestone: "FULFILLMENT_COMPLETED",
			completionMethod: "FULL_WORKFLOW",
			effectiveAt: new Date("2026-08-01T10:30:00.000Z"),
		});
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(1);
	});

	test("retains an active status-only declaration instead of replacing its provenance", async () => {
		const statusOnly = completionRecord();
		const fixture = createCompletionDb([statusOnly], {
			stat: [{ type: "prodCompleted", percentage: 100, score: 1, total: 1 }],
		});

		const result = await recordFullWorkflowCompletionIfProven(fixture.db, {
			salesOrderId: 91,
			milestone: "PRODUCTION_COMPLETED",
			actor: { id: 7, name: "Operator" },
		});

		expect(result).toMatchObject({
			recorded: false,
			idempotentReplay: false,
			reason: "ACTIVE_STATUS_ONLY",
			record: { id: statusOnly.id, completionMethod: "STATUS_ONLY" },
		});
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(0);
	});

	test("workflow-aware cancellation cancels Full provenance and its audit atomically", async () => {
		const full = completionRecord({ completionMethod: "FULL_WORKFLOW" });
		const fixture = createCompletionDb([full]);
		const cancelledAt = new Date("2026-09-01T15:00:00.000Z");

		const result = await cancelFullWorkflowCompletionInTransaction(
			fixture.tx as never,
			{
				salesOrderId: 91,
				milestone: "PRODUCTION_COMPLETED",
				requestId: "00000000-0000-4000-8000-000000000032",
				reason: "Workflow reversal",
				cancelledAt,
				actor: { id: 7, name: "Operator" },
			},
		);

		expect(result).toMatchObject({
			id: full.id,
			state: "CANCELLED",
			cancellationReason: "Workflow reversal",
		});
		expect(fixture.records).toHaveLength(1);
		expect(fixture.history).toHaveLength(1);
		expect(fixture.calls).toContain("salesCompletionRecord.update");
		expect(fixture.calls).toContain("salesHistory.create");
	});

	test("workflow-aware cancellation never cancels status-only provenance", async () => {
		const statusOnly = completionRecord();
		const fixture = createCompletionDb([statusOnly]);

		const result = await cancelFullWorkflowCompletionInTransaction(
			fixture.tx as never,
			{
				salesOrderId: 91,
				milestone: "PRODUCTION_COMPLETED",
				requestId: "00000000-0000-4000-8000-000000000033",
				reason: "Workflow reversal",
				cancelledAt: new Date("2026-09-01T15:00:00.000Z"),
				actor: { id: 7, name: "Operator" },
			},
		);

		expect(result).toBeNull();
		expect(statusOnly.state).toBe("ACTIVE");
		expect(fixture.history).toHaveLength(0);
		expect(fixture.calls).not.toContain("salesCompletionRecord.update");
	});
});
