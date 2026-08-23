import { describe, expect, it } from "bun:test";

import { splitProductionSubmissionQuantities } from "./production-assignment-aggregates";

describe("production assignment aggregates", () => {
	it("separates pending review from finalized production", () => {
		expect(
			splitProductionSubmissionQuantities([
				{ qty: 2, lhQty: 1, rhQty: 1, materialReview: { status: "PENDING" } },
				{ qty: 3, lhQty: 1, rhQty: 2, materialReview: { status: "APPROVED" } },
			]),
		).toEqual({
			finalized: { qty: 3, lh: 1, rh: 2 },
			pendingReview: { qty: 2, lh: 1, rh: 1 },
			reported: { qty: 5, lh: 2, rh: 3 },
		});
	});

	it("excludes rejected and cancelled reports from all active totals", () => {
		expect(
			splitProductionSubmissionQuantities([
				{ qty: 2, materialReview: { status: "REJECTED" } },
				{ qty: 3, materialReview: { status: "CANCELLED" } },
			]),
		).toEqual({
			finalized: { qty: 0, lh: 0, rh: 0 },
			pendingReview: { qty: 0, lh: 0, rh: 0 },
			reported: { qty: 0, lh: 0, rh: 0 },
		});
	});
});
