import { describe, expect, it } from "bun:test";

import { classifyProductionMaterialReviewActionability } from "./actionability";

const current = {
	reviewStatus: "PENDING",
	terminalOrder: false,
	activeSubmissionCount: 1,
	superseded: false,
};

describe("classifyProductionMaterialReviewActionability", () => {
	it.each([
		["material_shortage", "actionable_unresolved", true],
		["awaiting_inbound", "actionable_unresolved", true],
		["allocation_approval", "actionable_unresolved", true],
		["material_ready", "ready_to_converge", true],
		["ready_review_pending", "ready_to_converge", true],
		["material_conflict", "eligibility_conflict", true],
		["setup_needed", "true_setup_missing", true],
		["status_unknown", "ambiguous", true],
	] as const)(
		"classifies %s as %s",
		(materialStatus, expected, actionable) => {
			expect(
				classifyProductionMaterialReviewActionability({
					...current,
					materialStatus,
				}),
			).toMatchObject({ classification: expected, actionable });
		},
	);

	it("removes terminal, empty/retracted, superseded, and closed reviews from active work", () => {
		expect(
			classifyProductionMaterialReviewActionability({
				...current,
				terminalOrder: true,
				materialStatus: "material_shortage",
			}),
		).toMatchObject({ classification: "terminal_order", actionable: false });
		expect(
			classifyProductionMaterialReviewActionability({
				...current,
				activeSubmissionCount: 0,
				materialStatus: "material_shortage",
			}),
		).toMatchObject({
			classification: "empty_retracted",
			actionable: false,
		});
		expect(
			classifyProductionMaterialReviewActionability({
				...current,
				superseded: true,
				materialStatus: "material_shortage",
			}),
		).toMatchObject({ classification: "superseded", actionable: false });
		expect(
			classifyProductionMaterialReviewActionability({
				...current,
				reviewStatus: "APPROVED",
				materialStatus: "material_ready",
			}),
		).toMatchObject({ classification: "closed", actionable: false });
	});
});
