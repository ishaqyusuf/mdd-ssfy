import type { SalesPipelineSnapshot } from "./sales-pipeline";
import { evaluateSalesPipelineCommand } from "./sales-pipeline-commands";

export type ProductionPlanningReason =
	| "not_assigned"
	| "partially_assigned"
	| "needs_review";

/** Planning is a read projection of canonical evidence, never an assignment. */
export function resolveProductionPlanningGap(
	snapshot: SalesPipelineSnapshot,
	options: { authorizedToAssign: boolean },
) {
	const { commercial, production, evidence } = snapshot;
	if (
		evidence.commercial.deletedAt ||
		evidence.commercial.archivedAt ||
		commercial.state === "cancelled" ||
		production.applicability === "not_required" ||
		production.state === "completed" ||
		production.state === "administratively_completed"
	) {
		return null;
	}
	const requiredQty = production.requiredQty;
	const assignedQty = production.assignedQty;
	const uncoveredQty = Math.max(0, requiredQty - assignedQty);
	if (requiredQty > 0 && uncoveredQty === 0) return null;

	const decision = evaluateSalesPipelineCommand(snapshot, {
		action: "production.assign",
		authorized: true,
	});
	const needsReview =
		snapshot.freshness.state !== "current" ||
		commercial.state === "unknown" ||
		production.applicability === "unknown" ||
		production.applicability === "conflict" ||
		requiredQty <= 0 ||
		decision.status !== "ready";
	const reason: ProductionPlanningReason = needsReview
		? "needs_review"
		: assignedQty > 0
			? "partially_assigned"
			: "not_assigned";
	return {
		kind: "planning" as const,
		reason,
		label:
			reason === "needs_review"
				? "Needs review"
				: reason === "partially_assigned"
					? "Partially assigned"
					: "Not assigned",
		requiredQty,
		assignedQty,
		uncoveredQty,
		assignmentCount: production.assignmentIds.length,
		canAssign: options.authorizedToAssign && !needsReview,
		reviewMessage: !needsReview
			? null
			: production.applicability === "unknown"
				? "Production requirements have not been established."
				: production.applicability === "conflict" ||
						decision.status === "review_required"
					? "Lifecycle evidence requires review before Production can be assigned."
					: requiredQty <= 0
						? "Required Production quantity is unavailable."
						: "Current Production evidence is unavailable. Refresh or review the order.",
		assignmentLockReasons: needsReview
			? Array.from(
					new Set([
						...decision.reasons,
						...(production.applicability === "unknown"
							? ["STAGE_APPLICABILITY_UNKNOWN"]
							: []),
						...(snapshot.freshness.state !== "current"
							? ["STATUS_UNAVAILABLE"]
							: []),
						...(commercial.state === "unknown"
							? ["COMMERCIAL_STATUS_UNAVAILABLE"]
							: []),
						...(requiredQty <= 0 ? ["PRODUCTION_QUANTITY_UNAVAILABLE"] : []),
					]),
				)
			: options.authorizedToAssign
				? []
				: ["PERMISSION_DENIED"],
	};
}
