import { describe, expect, it } from "bun:test";
import {
	BULK_FULFILLMENT_LIMIT,
	normalizeBulkFulfillmentSalesIds,
	prepareBulkFulfillmentResolution,
	summarizeBulkFulfillmentResult,
} from "./bulk-fulfillment";

describe("bulk fulfillment", () => {
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
