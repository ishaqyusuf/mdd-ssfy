import { describe, expect, it } from "bun:test";
import {
	BULK_FULFILLMENT_LIMIT,
	buildBulkFulfillmentRounds,
	normalizeBulkFulfillmentSalesIds,
	prepareBulkFulfillmentResolution,
	resolveBulkFulfillmentCompletionOutcome,
	summarizeBulkFulfillmentResult,
} from "./bulk-fulfillment";

describe("bulk fulfillment", () => {
	it("serializes each order's fulfillments while batching independent orders", () => {
		expect(
			buildBulkFulfillmentRounds([
				{
					salesId: 1,
					orderNo: "A",
					dispatchId: 13,
					dispatchIds: [11, 12, 12, 13],
				},
				{ salesId: 2, orderNo: "B", dispatchId: 21 },
			]),
		).toEqual([
			[
				{ salesId: 1, orderNo: "A", dispatchId: 11, final: false },
				{ salesId: 2, orderNo: "B", dispatchId: 21, final: true },
			],
			[{ salesId: 1, orderNo: "A", dispatchId: 12, final: false }],
			[{ salesId: 1, orderNo: "A", dispatchId: 13, final: true }],
		]);
	});
	it("requires order-level completion after a successful fulfillment job", () => {
		const item = { salesId: 1, orderNo: "A", dispatchId: 11 };
		expect(
			resolveBulkFulfillmentCompletionOutcome(item, "fulfilled").status,
		).toBe("succeeded");
		for (const state of [
			"partially_fulfilled",
			"packed",
			"unknown",
			undefined,
		] as const) {
			expect(
				resolveBulkFulfillmentCompletionOutcome(item, state),
			).toMatchObject({
				...item,
				status: "review_required",
				error: expect.any(String),
			});
		}
		expect(
			resolveBulkFulfillmentCompletionOutcome(
				item,
				"administratively_completed",
			).status,
		).toBe("already_fulfilled");
	});
	it("deduplicates valid ids and rejects more than the batch limit", () => {
		expect(normalizeBulkFulfillmentSalesIds([4, 4, 9])).toEqual([4, 9]);
		expect(() =>
			normalizeBulkFulfillmentSalesIds(
				Array.from(
					{ length: BULK_FULFILLMENT_LIMIT + 1 },
					(_, index) => index + 1,
				),
			),
		).toThrow("limited to 40 orders");
	});

	it("separates ready and idempotently fulfilled orders", () => {
		const result = prepareBulkFulfillmentResolution([
			{
				salesId: 1,
				orderNo: "A",
				dispatchId: 11,
				state: "ready",
				created: true,
			},
			{
				salesId: 2,
				orderNo: "B",
				dispatchId: 12,
				state: "already_fulfilled",
				created: false,
			},
		]);
		expect(result.ready).toEqual([
			{ salesId: 1, orderNo: "A", dispatchId: 11 },
		]);
		expect(result.outcomes).toEqual([
			{
				salesId: 2,
				orderNo: "B",
				dispatchId: 12,
				status: "already_fulfilled",
			},
		]);
	});

	it("summarizes partial results without hiding failures", () => {
		const result = summarizeBulkFulfillmentResult({
			requestId: "request-1",
			backlogCount: 42,
			total: 4,
			startedAt: Date.now(),
			outcomes: [
				{ salesId: 1, status: "succeeded" },
				{ salesId: 2, status: "already_fulfilled" },
				{ salesId: 3, status: "review_required", error: "Conflict" },
				{ salesId: 4, status: "failed", error: "Blocked" },
			],
		});
		expect(result).toMatchObject({
			backlogCount: 42,
			total: 4,
			succeeded: 1,
			alreadyFulfilled: 1,
			reviewRequired: 1,
			failed: 1,
		});
	});
});
