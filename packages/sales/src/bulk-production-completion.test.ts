import { describe, expect, it } from "bun:test";
import {
	BULK_PRODUCTION_COMPLETION_LIMIT,
	hasCompletedProductionLifecycle,
	normalizeBulkProductionCompletionSalesIds,
	prepareBulkProductionCompletion,
	summarizeBulkProductionCompletionResult,
} from "./bulk-production-completion";

describe("bulk production completion", () => {
	it("recognizes every lifecycle state already past production completion", () => {
		expect(hasCompletedProductionLifecycle("ready_to_fulfill")).toBe(true);
		expect(hasCompletedProductionLifecycle("fulfilled")).toBe(true);
		expect(hasCompletedProductionLifecycle("in_production")).toBe(false);
		expect(hasCompletedProductionLifecycle("cancelled")).toBe(false);
	});

	it("deduplicates valid ids and rejects oversized batches", () => {
		expect(normalizeBulkProductionCompletionSalesIds([4, 4, 9])).toEqual([
			4, 9,
		]);
		expect(() =>
			normalizeBulkProductionCompletionSalesIds(
				Array.from(
					{ length: BULK_PRODUCTION_COMPLETION_LIMIT + 1 },
					(_, index) => index + 1,
				),
			),
		).toThrow("limited to 40 orders");
	});

	it("skips completed orders and reports stale or cancelled rows", () => {
		const result = prepareBulkProductionCompletion({
			salesIds: [1, 2, 3, 4],
			candidates: [
				{ salesId: 1, orderNo: "A", lifecycleStatus: "in_production" },
				{ salesId: 2, orderNo: "B", lifecycleStatus: "ready_to_fulfill" },
				{ salesId: 3, orderNo: "C", lifecycleStatus: "cancelled" },
			],
		});

		expect(result.ready).toEqual([{ salesId: 1, orderNo: "A" }]);
		expect(result.outcomes).toEqual([
			{ salesId: 2, orderNo: "B", status: "already_completed" },
			{
				salesId: 3,
				orderNo: "C",
				status: "failed",
				error: "Cancelled orders cannot be marked production completed.",
			},
			{
				salesId: 4,
				status: "failed",
				error: "The sales order is no longer available.",
			},
		]);
	});

	it("summarizes actual completion, review, skip, and failure outcomes", () => {
		const result = summarizeBulkProductionCompletionResult({
			requestId: "request-1",
			total: 4,
			startedAt: Date.now(),
			outcomes: [
				{ salesId: 1, status: "succeeded" },
				{ salesId: 2, status: "already_completed" },
				{ salesId: 3, status: "awaiting_review" },
				{ salesId: 4, status: "failed", error: "Blocked" },
			],
		});

		expect(result).toMatchObject({
			total: 4,
			succeeded: 1,
			alreadyCompleted: 1,
			awaitingReview: 1,
			failed: 1,
		});
	});
});
