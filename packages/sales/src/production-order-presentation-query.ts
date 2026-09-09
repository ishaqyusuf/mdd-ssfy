import type { Db } from "@gnd/db";
import {
	getProductionOrderPresentation,
	type ProductionReviewAttentionReason,
} from "./production-order-presentation";
import type { SalesPipelineSnapshot } from "./sales-pipeline";

/** One bounded review query for the orders already loaded by the workspace. */
export async function getProductionOrderPresentations(
	db: Db,
	snapshots: ReadonlyMap<number, SalesPipelineSnapshot>,
) {
	const submissionIds = [...snapshots.values()].flatMap((snapshot) =>
		snapshot.evidence.production.submissions
			.filter(
				(submission) =>
					submission.active &&
					["pending", "pending_review"].includes(
						submission.reviewStatus?.toLowerCase() ?? "",
					),
			)
			.map((submission) => submission.id),
	);
	const reviews = submissionIds.length
		? await db.salesProductionSubmissionMaterialReview.findMany({
				where: {
					salesOrderId: { in: [...snapshots.keys()] },
					status: "PENDING",
					submissions: { some: { id: { in: submissionIds }, deletedAt: null } },
				},
				select: { salesOrderId: true, classificationReason: true },
			})
		: [];
	const reasons = new Map<number, ProductionReviewAttentionReason[]>();
	for (const review of reviews) {
		if (!review.classificationReason) continue;
		const orderReasons = reasons.get(review.salesOrderId) ?? [];
		orderReasons.push(review.classificationReason);
		reasons.set(review.salesOrderId, orderReasons);
	}
	return new Map(
		[...snapshots].map(([orderId, snapshot]) => [
			orderId,
			getProductionOrderPresentation(snapshot, reasons.get(orderId)),
		]),
	);
}
