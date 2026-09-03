export const PRODUCTION_SUBMISSION_MATERIAL_REVIEW_STATUSES = [
	"PENDING",
	"APPROVED",
	"REJECTED",
	"CANCELLED",
] as const;

export type ProductionSubmissionMaterialReviewStatus =
	(typeof PRODUCTION_SUBMISSION_MATERIAL_REVIEW_STATUSES)[number];

export const PRODUCTION_SUBMISSION_MATERIAL_REVIEW_REASONS = [
	"AWAITING_INBOUND",
	"ALLOCATION_REVIEW",
	"BLOCKED",
	"NOT_CONFIGURED",
	"PROJECTION_UNAVAILABLE",
] as const;

export type ProductionSubmissionMaterialReviewReason =
	(typeof PRODUCTION_SUBMISSION_MATERIAL_REVIEW_REASONS)[number];

export type ProductionSubmissionMaterialClassification =
	| {
			state: "finalized";
			reason: null;
	  }
	| {
			state: "pending_material_review";
			reason: ProductionSubmissionMaterialReviewReason;
	  };

type MaterialProjection = {
	state: "available" | "unavailable";
	materials: Array<{
		readiness: string;
		productionEligibilityConflict?: boolean;
	}>;
};

const READY_MATERIAL_STATES = new Set(["ready_for_production", "fulfilled"]);

export function classifyProductionSubmissionMaterials(
	projection: MaterialProjection,
): ProductionSubmissionMaterialClassification {
	if (projection.state === "unavailable") {
		return {
			state: "pending_material_review",
			reason: "PROJECTION_UNAVAILABLE",
		};
	}
	if (!projection.materials.length) {
		return {
			state: "pending_material_review",
			reason: "NOT_CONFIGURED",
		};
	}
	if (
		projection.materials.some(
			(material) => material.productionEligibilityConflict,
		)
	) {
		return {
			state: "pending_material_review",
			reason: "BLOCKED",
		};
	}

	const unresolved = projection.materials.filter(
		(material) => !READY_MATERIAL_STATES.has(material.readiness),
	);
	if (!unresolved.length) {
		return {
			state: "finalized",
			reason: null,
		};
	}
	if (
		unresolved.some((material) => material.readiness === "awaiting_inbound")
	) {
		return {
			state: "pending_material_review",
			reason: "AWAITING_INBOUND",
		};
	}
	if (
		unresolved.some((material) => material.readiness === "allocation_review")
	) {
		return {
			state: "pending_material_review",
			reason: "ALLOCATION_REVIEW",
		};
	}
	return {
		state: "pending_material_review",
		reason: "BLOCKED",
	};
}

type SubmissionReviewState = {
	deletedAt?: Date | string | null;
	materialReview?: {
		status: ProductionSubmissionMaterialReviewStatus | string;
	} | null;
};

type SalesOrderSubmissionReviewState = SubmissionReviewState & {
	salesOrderId?: number | null;
};

export function isActiveReportedSubmission(
	submission: SubmissionReviewState,
): boolean {
	if (submission.deletedAt) return false;
	const status = submission.materialReview?.status;
	return !status || status === "PENDING" || status === "APPROVED";
}

export function isActiveReportedSubmissionForSalesOrder(
	submission: SalesOrderSubmissionReviewState,
	salesOrderId: number,
): boolean {
	return (
		submission.salesOrderId === salesOrderId &&
		isActiveReportedSubmission(submission)
	);
}

export function isFinalizedProductionSubmission(
	submission: SubmissionReviewState,
): boolean {
	if (submission.deletedAt) return false;
	const status = submission.materialReview?.status;
	return !status || status === "APPROVED";
}

export function isFinalizedProductionSubmissionForSalesOrder(
	submission: SalesOrderSubmissionReviewState,
	salesOrderId: number,
): boolean {
	return (
		submission.salesOrderId === salesOrderId &&
		isFinalizedProductionSubmission(submission)
	);
}
