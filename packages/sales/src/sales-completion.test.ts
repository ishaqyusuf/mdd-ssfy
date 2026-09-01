import { describe, expect, mock, test } from "bun:test";

import type { Database } from "@gnd/db";

import {
	SalesCompletionError,
	type SalesCompletionRecordView,
	buildSalesCompletionActiveKey,
	cancelProductionCompletionStatusOnly,
	getSalesCompletionProjection,
	hasCanonicalSalesFulfillmentEvidence,
	markProductionCompletionStatusOnly,
	resolveSalesCompletionProjection,
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
