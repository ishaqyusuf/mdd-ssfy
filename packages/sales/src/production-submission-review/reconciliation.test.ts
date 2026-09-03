import { describe, expect, it } from "bun:test";

import { classifyProductionMaterialReviewActionability } from "./actionability";
import {
	buildProductionMaterialReviewRepairPlan,
	currentReviewReasonFromMaterialStatus,
} from "./reconciliation";

const reconciliationSource = await Bun.file(
	new URL("./reconciliation.ts", import.meta.url),
).text();

function actionability(
	input: Partial<
		Parameters<typeof classifyProductionMaterialReviewActionability>[0]
	> = {},
) {
	return classifyProductionMaterialReviewActionability({
		reviewStatus: "PENDING",
		terminalOrder: false,
		activeSubmissionCount: 1,
		superseded: false,
		materialStatus: "material_shortage",
		...input,
	});
}

describe("production material review reconciliation", () => {
	it("maps current material status to the existing durable review vocabulary", () => {
		expect(currentReviewReasonFromMaterialStatus("awaiting_inbound")).toBe(
			"AWAITING_INBOUND",
		);
		expect(currentReviewReasonFromMaterialStatus("allocation_approval")).toBe(
			"ALLOCATION_REVIEW",
		);
		expect(currentReviewReasonFromMaterialStatus("material_shortage")).toBe(
			"BLOCKED",
		);
		expect(
			currentReviewReasonFromMaterialStatus("material_conflict"),
		).toBeNull();
	});

	it("plans only deterministic history-preserving cancellation and reclassification", () => {
		expect(
			buildProductionMaterialReviewRepairPlan({
				actionability: actionability({ activeSubmissionCount: 0 }),
				materialStatus: "material_shortage",
				storedReason: "BLOCKED",
			}).operation,
		).toBe("cancel_empty_retracted");
		expect(
			buildProductionMaterialReviewRepairPlan({
				actionability: actionability({ terminalOrder: true }),
				materialStatus: "material_shortage",
				storedReason: "BLOCKED",
			}).operation,
		).toBe("cancel_terminal_order");
		expect(
			buildProductionMaterialReviewRepairPlan({
				actionability: actionability(),
				materialStatus: "material_shortage",
				storedReason: "AWAITING_INBOUND",
			}).operation,
		).toBe("reclassify_reason");
	});

	it("keeps conflict and unchanged evidence human-reviewed", () => {
		expect(
			buildProductionMaterialReviewRepairPlan({
				actionability: actionability({
					materialStatus: "material_conflict",
				}),
				materialStatus: "material_conflict",
				storedReason: "NOT_CONFIGURED",
			}).operation,
		).toBe("none");
		expect(
			buildProductionMaterialReviewRepairPlan({
				actionability: actionability(),
				materialStatus: "material_shortage",
				storedReason: "BLOCKED",
			}).operation,
		).toBe("none");
	});

	it("persists before and after evidence for every history repair", () => {
		expect(reconciliationSource).toContain("before,");
		expect(reconciliationSource).toContain("after: {");
		expect(reconciliationSource).toContain("expectedUpdatedAt");
	});
});
