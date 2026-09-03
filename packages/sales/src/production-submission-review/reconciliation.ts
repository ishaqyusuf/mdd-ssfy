import type { Db } from "../types";
import type {
	ProductionMaterialReviewActionability,
	ProductionMaterialReviewClassification,
} from "./actionability";

export type ProductionMaterialReviewReason =
	| "AWAITING_INBOUND"
	| "ALLOCATION_REVIEW"
	| "BLOCKED"
	| "NOT_CONFIGURED"
	| "PROJECTION_UNAVAILABLE";

export type ProductionMaterialReviewRepairOperation =
	| "none"
	| "cancel_empty_retracted"
	| "cancel_terminal_order"
	| "reclassify_reason"
	| "approve_ready";

export type ProductionMaterialReviewRepairPlan = {
	operation: ProductionMaterialReviewRepairOperation;
	classificationVersion: ProductionMaterialReviewActionability["version"];
	classification: ProductionMaterialReviewClassification;
	currentReason: ProductionMaterialReviewReason | null;
	reason: string;
};

export function currentReviewReasonFromMaterialStatus(
	status: string,
): ProductionMaterialReviewReason | null {
	if (status === "awaiting_inbound") return "AWAITING_INBOUND";
	if (status === "allocation_approval") return "ALLOCATION_REVIEW";
	if (status === "material_shortage") return "BLOCKED";
	if (status === "setup_needed") return "NOT_CONFIGURED";
	if (status === "status_unknown") return "PROJECTION_UNAVAILABLE";
	return null;
}

export function buildProductionMaterialReviewRepairPlan(input: {
	actionability: ProductionMaterialReviewActionability;
	materialStatus: string;
	storedReason: ProductionMaterialReviewReason | null;
}): ProductionMaterialReviewRepairPlan {
	const currentReason = currentReviewReasonFromMaterialStatus(
		input.materialStatus,
	);
	if (input.actionability.supportedRepair === "cancel_empty_retracted") {
		return {
			operation: "cancel_empty_retracted",
			classificationVersion: input.actionability.version,
			classification: input.actionability.classification,
			currentReason,
			reason: input.actionability.reason,
		};
	}
	if (input.actionability.supportedRepair === "cancel_terminal_order") {
		return {
			operation: "cancel_terminal_order",
			classificationVersion: input.actionability.version,
			classification: input.actionability.classification,
			currentReason,
			reason: input.actionability.reason,
		};
	}
	if (input.actionability.supportedRepair === "approve_ready") {
		return {
			operation: "approve_ready",
			classificationVersion: input.actionability.version,
			classification: input.actionability.classification,
			currentReason,
			reason: input.actionability.reason,
		};
	}
	if (
		input.actionability.supportedRepair === "reclassify_reason" &&
		currentReason &&
		currentReason !== input.storedReason
	) {
		return {
			operation: "reclassify_reason",
			classificationVersion: input.actionability.version,
			classification: input.actionability.classification,
			currentReason,
			reason: `Stored reason ${input.storedReason || "none"} differs from current reason ${currentReason}.`,
		};
	}
	return {
		operation: "none",
		classificationVersion: input.actionability.version,
		classification: input.actionability.classification,
		currentReason,
		reason: input.actionability.reason,
	};
}

/**
 * Applies only history-preserving deterministic repairs. Ready-review approval
 * deliberately stays on decideProductionSubmissionMaterialReview so payroll,
 * payment review, completion, and audit effects remain atomic and unchanged.
 */
export async function applyProductionMaterialReviewHistoryRepair(
	db: Db,
	input: {
		reviewId: number;
		expectedUpdatedAt: Date;
		plan: ProductionMaterialReviewRepairPlan;
		actor: { id: number; name: string };
		reason: string;
		materialSnapshot: unknown;
		materialRevision: string;
	},
) {
	if (
		input.plan.operation !== "cancel_empty_retracted" &&
		input.plan.operation !== "cancel_terminal_order" &&
		input.plan.operation !== "reclassify_reason"
	) {
		return { changed: false, operation: input.plan.operation };
	}
	return db.$transaction(async (tx) => {
		const cancel = input.plan.operation.startsWith("cancel_");
		const before = await tx.salesProductionSubmissionMaterialReview.findFirst({
			where: {
				id: input.reviewId,
				status: "PENDING",
				updatedAt: input.expectedUpdatedAt,
			},
			select: {
				status: true,
				classificationReason: true,
				materialRevision: true,
				decisionNote: true,
				resolution: true,
				cancelledAt: true,
			},
		});
		if (!before) {
			return { changed: false, operation: input.plan.operation };
		}
		const updated = await tx.salesProductionSubmissionMaterialReview.updateMany(
			{
				where: {
					id: input.reviewId,
					status: "PENDING",
					updatedAt: input.expectedUpdatedAt,
				},
				data: cancel
					? {
							status: "CANCELLED",
							cancelledAt: new Date(),
							decisionNote: input.reason,
							resolution: {
								action: input.plan.operation.toUpperCase(),
								classification: input.plan.classification,
								actorId: input.actor.id,
							},
						}
					: {
							classificationReason: input.plan.currentReason,
							materialSnapshot: input.materialSnapshot as never,
							materialRevision: input.materialRevision,
							decisionNote: input.reason,
							resolution: {
								action: "RECLASSIFY_REASON",
								classification: input.plan.classification,
								actorId: input.actor.id,
							},
						},
			},
		);
		if (updated.count !== 1) {
			return { changed: false, operation: input.plan.operation };
		}
		const review =
			await tx.salesProductionSubmissionMaterialReview.findUniqueOrThrow({
				where: { id: input.reviewId },
				select: { salesOrderId: true },
			});
		await tx.salesHistory.create({
			data: {
				salesId: review.salesOrderId,
				name: "Production material review reconciled",
				authorName: input.actor.name,
				data: {
					event: "production_material_review_reconciled",
					reviewId: input.reviewId,
					operation: input.plan.operation,
					classification: input.plan.classification,
					classificationVersion: input.plan.classificationVersion,
					actorId: input.actor.id,
					reason: input.reason,
					materialRevision: input.materialRevision,
					before,
					after: {
						status: cancel ? "CANCELLED" : "PENDING",
						classificationReason: cancel
							? before.classificationReason
							: input.plan.currentReason,
						materialRevision: cancel
							? before.materialRevision
							: input.materialRevision,
						decisionNote: input.reason,
						resolutionAction: input.plan.operation.toUpperCase(),
					},
				},
			},
		});
		return { changed: true, operation: input.plan.operation };
	});
}
