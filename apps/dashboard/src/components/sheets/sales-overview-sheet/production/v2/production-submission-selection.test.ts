import { describe, expect, it } from "bun:test";

import {
	getEligibleProductionSubmissionAssignments,
	hasPendingProductionQuantity,
	resolveProductionSubmissionAssignmentIndex,
} from "./production-submission-selection";

describe("Production V2 submission assignment selection", () => {
	it("returns no selection when no assignment can accept a submission", () => {
		const eligible = getEligibleProductionSubmissionAssignments([
			{ pending: { qty: 0 } },
		]);

		expect(eligible).toHaveLength(0);
		expect(
			resolveProductionSubmissionAssignmentIndex(eligible, null),
		).toBeNull();
	});

	it("selects the only eligible assignment", () => {
		const eligible = getEligibleProductionSubmissionAssignments([
			{ pending: { qty: 0 } },
			{ pending: { lh: 1, rh: 1 } },
		]);

		expect(resolveProductionSubmissionAssignmentIndex(eligible, null)).toBe(1);
		expect(hasPendingProductionQuantity({ lh: 1, rh: 1, qty: 0 })).toBe(true);
	});

	it("defaults multiple eligible assignments to the earliest due date", () => {
		const eligible = getEligibleProductionSubmissionAssignments([
			{ dueDate: "2026-09-12", pending: { qty: 1 } },
			{ dueDate: "2026-09-10", pending: { qty: 1 } },
			{ dueDate: null, pending: { qty: 1 } },
		]);

		expect(eligible.map(({ index }) => index)).toEqual([1, 0, 2]);
		expect(resolveProductionSubmissionAssignmentIndex(eligible, null)).toBe(1);
		expect(resolveProductionSubmissionAssignmentIndex(eligible, 0)).toBe(0);
	});
});
