import type { ItemMaterialStatusCode } from "../item-material-status";

export const PRODUCTION_MATERIAL_REVIEW_CLASSIFICATION_VERSION =
	"production-material-review/v1" as const;

export type ProductionMaterialReviewClassification =
	| "actionable_unresolved"
	| "ready_to_converge"
	| "eligibility_conflict"
	| "true_setup_missing"
	| "empty_retracted"
	| "terminal_order"
	| "superseded"
	| "ambiguous"
	| "closed";

export type ProductionMaterialReviewActionability = {
	version: typeof PRODUCTION_MATERIAL_REVIEW_CLASSIFICATION_VERSION;
	classification: ProductionMaterialReviewClassification;
	actionable: boolean;
	reason: string;
	supportedRepair:
		| "approve_ready"
		| "cancel_empty_retracted"
		| "cancel_terminal_order"
		| "reclassify_reason"
		| null;
};

export function classifyProductionMaterialReviewActionability(input: {
	reviewStatus: string;
	terminalOrder: boolean;
	activeSubmissionCount: number;
	superseded: boolean;
	materialStatus: ItemMaterialStatusCode;
}): ProductionMaterialReviewActionability {
	const base = { version: PRODUCTION_MATERIAL_REVIEW_CLASSIFICATION_VERSION };
	if (input.reviewStatus !== "PENDING") {
		return {
			...base,
			classification: "closed",
			actionable: false,
			reason: "The review is already closed and remains available as audit history.",
			supportedRepair: null,
		};
	}
	if (input.terminalOrder) {
		return {
			...base,
			classification: "terminal_order",
			actionable: false,
			reason: "The order is terminal, so this review is audit history only.",
			supportedRepair: "cancel_terminal_order",
		};
	}
	if (input.activeSubmissionCount <= 0) {
		return {
			...base,
			classification: "empty_retracted",
			actionable: false,
			reason: "No active production submission remains in this review scope.",
			supportedRepair: "cancel_empty_retracted",
		};
	}
	if (input.superseded) {
		return {
			...base,
			classification: "superseded",
			actionable: false,
			reason: "A newer review owns the current production submission scope.",
			supportedRepair: null,
		};
	}
	if (
		input.materialStatus === "material_ready" ||
		input.materialStatus === "ready_review_pending"
	) {
		return {
			...base,
			classification: "ready_to_converge",
			actionable: true,
			reason: "Current material evidence is ready and review finalization remains.",
			supportedRepair: "approve_ready",
		};
	}
	if (input.materialStatus === "material_conflict") {
		return {
			...base,
			classification: "eligibility_conflict",
			actionable: true,
			reason: "Production evidence conflicts with synchronized eligibility metadata.",
			supportedRepair: null,
		};
	}
	if (input.materialStatus === "setup_needed") {
		return {
			...base,
			classification: "true_setup_missing",
			actionable: true,
			reason: "Exact item evaluation found no tracked material configuration.",
			supportedRepair: "reclassify_reason",
		};
	}
	if (
		input.materialStatus === "status_unknown" ||
		input.materialStatus === "not_required"
	) {
		return {
			...base,
			classification: "ambiguous",
			actionable: true,
			reason: "Current evidence cannot safely resolve this production review.",
			supportedRepair: null,
		};
	}
	return {
		...base,
		classification: "actionable_unresolved",
		actionable: true,
		reason: "Current material evidence still requires an operator decision.",
		supportedRepair: "reclassify_reason",
	};
}
