import { describe, expect, it } from "bun:test";

import type { ItemMaterialStatusCode } from "../item-material-status";
import {
	classifyProductionMaterialReviewActionability,
	getProductionMaterialReviewInactivity,
} from "./actionability";

const current = {
	reviewStatus: "PENDING",
	terminalOrder: false,
	activeSubmissionCount: 1,
	superseded: false,
	assignmentScopeIssues: [],
};

describe("classifyProductionMaterialReviewActionability", () => {
	it.each([
		[{}, true],
		[{ terminalOrder: true }, false],
		[{ activeSubmissionCount: 0 }, false],
		[{ superseded: true }, false],
		[{ reviewStatus: "APPROVED" }, false],
	] as const)("keeps exact membership independent of detail for %j", (scope, expected) => {
		const statuses = {
			material_ready: true,
			ready_review_pending: true,
			allocation_approval: true,
			awaiting_inbound: true,
			material_shortage: true,
			setup_needed: true,
			material_conflict: true,
			status_unknown: true,
			not_required: true,
		} satisfies Record<ItemMaterialStatusCode, true>;
		for (const materialStatus of Object.keys(statuses) as ItemMaterialStatusCode[]) {
			for (const assignmentScopeIssues of [[], ["stale assignment"], null]) {
				const input = { ...current, ...scope, materialStatus, assignmentScopeIssues };
				expect(classifyProductionMaterialReviewActionability(input).actionable).toBe(expected);
				expect(getProductionMaterialReviewInactivity(input) === null).toBe(expected);
			}
		}
	});

	it.each([
		["material_shortage", "actionable_unresolved", true],
		["awaiting_inbound", "actionable_unresolved", true],
		["allocation_approval", "actionable_unresolved", true],
		["material_ready", "ready_to_converge", true],
		["ready_review_pending", "ready_to_converge", true],
		["material_conflict", "eligibility_conflict", true],
		["setup_needed", "true_setup_missing", true],
		["status_unknown", "ambiguous", true],
	] as const)("classifies %s as %s", (materialStatus, expected, actionable) => {
		expect(
			classifyProductionMaterialReviewActionability({
				...current,
				materialStatus,
			}),
		).toMatchObject({ classification: expected, actionable });
	});

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
