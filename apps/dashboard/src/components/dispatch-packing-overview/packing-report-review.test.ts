import { describe, expect, it } from "bun:test";

import {
	canShowPackingReviewActions,
	packingReportDecisionInput,
	packingReportStatusPresentation,
} from "./packing-report-review";

describe("packing report presentation", () => {
	it("distinguishes pending evidence from finalized packed quantity", () => {
		expect(packingReportStatusPresentation("PENDING")).toMatchObject({
			label: "Physically verified · awaiting review",
		});
		expect(packingReportStatusPresentation("APPROVED")).toMatchObject({
			label: "Finalized Packed Quantity",
		});
		expect(packingReportStatusPresentation("REJECTED").description).toContain(
			"No canonical packing quantity",
		);
	});

	it("hides reviewer actions from assignment-only packing actors", () => {
		expect(canShowPackingReviewActions({ canReview: false })).toBe(false);
		expect(canShowPackingReviewActions({ canReview: true })).toBe(true);
	});

	it("normalizes serialized report timestamps for the decision contract", () => {
		const input = packingReportDecisionInput(
			{
				id: 81,
				updatedAt: "2026-08-23T10:00:00.000Z",
			},
			"APPROVE",
			"Physically verified packing approved.",
		);

		expect(input).toEqual({
			reportId: 81,
			expectedUpdatedAt: new Date("2026-08-23T10:00:00.000Z"),
			action: "APPROVE",
			note: "Physically verified packing approved.",
		});
	});
});
