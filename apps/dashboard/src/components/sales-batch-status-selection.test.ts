import { describe, expect, it } from "bun:test";

import { resolveSalesBatchStatusSelection } from "./sales-batch-status-selection";

describe("sales batch status selection", () => {
	it("skips orders that already completed production", () => {
		expect(
			resolveSalesBatchStatusSelection({
				action: "production_completed",
				salesIds: [11, 12, 13, 14],
				candidates: [
					{ salesId: 11, status: "in_production" },
					{ salesId: 12, status: "ready_to_fulfill" },
					{ salesId: 13, status: "fulfilled" },
					{ salesId: 14, productionCompleted: true },
				],
			}),
		).toEqual({
			eligibleSalesIds: [11],
			skippedSalesIds: [12, 13, 14],
		});
	});

	it("keeps production-completed orders eligible for fulfillment", () => {
		expect(
			resolveSalesBatchStatusSelection({
				action: "fulfilled",
				salesIds: [21, 22, 23],
				candidates: [
					{ salesId: 21, status: "ready_to_fulfill" },
					{ salesId: 22, status: "packing" },
					{ salesId: 23, status: "fulfilled" },
				],
			}),
		).toEqual({
			eligibleSalesIds: [21, 22],
			skippedSalesIds: [23],
		});
	});

	it("keeps unknown candidates eligible for backward-compatible callers", () => {
		expect(
			resolveSalesBatchStatusSelection({
				action: "production_completed",
				salesIds: [31, 32],
				candidates: [{ salesId: 31, status: "ready_to_fulfill" }],
			}),
		).toEqual({
			eligibleSalesIds: [32],
			skippedSalesIds: [31],
		});
	});
});
