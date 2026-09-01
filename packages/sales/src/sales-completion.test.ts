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
	markProductionCompletionStatusOnly,
	recordFullWorkflowCompletionIfProven,
	resolveSalesCompletionProjection,
	resolveSalesCompletionProjectionFromOrder,
	salesCompletionLabels,
	salesCompletionProjectionSourceRevision,
} from "./sales-completion";

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
		expect(
			buildSalesCompletionSatisfactionWhere("PRODUCTION_COMPLETED", true),
		).toMatchObject({
			OR: expect.arrayContaining([
				{ prodStatus: { in: expect.arrayContaining(["completed", "N/A"]) } },
			]),
		});
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
				}: { where: { id: string }; data: Record<string, unknown> }) => {
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

describe("status-only Production commands", () => {
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
