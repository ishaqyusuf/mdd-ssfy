import type { Db, TransactionClient } from "@gnd/db";
import { AppError } from "@gnd/errors";
import {
	productionMaterialReviewScopeSubmissionSelect,
	validateProductionMaterialReviewAssignmentScope,
} from "./production-submission-review/assignment-scope";
import { decideProductionSubmissionMaterialReviewInTransaction } from "./production-submission-review/decision";
import { parseItemScope } from "./production-submission-review/queries";
import { evaluateProductionSubmissionMaterialEvidence } from "./production-submission-review/service";
import { recordFullWorkflowCompletionIfProvenInTransaction } from "./sales-completion";

export function reviewTouchesReceivedComponents(
	materialSnapshot: unknown,
	componentIds: readonly number[],
) {
	if (!Array.isArray(materialSnapshot)) return false;
	const received = new Set(componentIds);
	return materialSnapshot.some(
		(material) =>
			material &&
			typeof material === "object" &&
			received.has(material.componentId),
	);
}

/** Receipt already applied its scoped Needs; do not run order-wide material repair. */
export async function reconcileProductionInboundReviews(
	tx: TransactionClient,
	input: {
		salesOrderId: number;
		componentIds: number[];
		actorId: number;
		authorizedAssignmentIds: number[] | null;
	},
) {
	const reviews = await tx.salesProductionSubmissionMaterialReview.findMany({
		where: { salesOrderId: input.salesOrderId, status: "PENDING" },
		orderBy: { id: "asc" },
		take: 101,
		include: {
			submissions: {
				where: { deletedAt: null },
				select: productionMaterialReviewScopeSubmissionSelect,
			},
		},
	});
	if (reviews.length > 100)
		throw new AppError({
			code: "CONFLICT",
			publicMessage:
				"Open Inventory to receive this order with a larger review queue.",
		});
	const approvedReviewIds: number[] = [];
	const skippedReviewIds: number[] = [];
	for (const review of reviews) {
		if (
			!reviewTouchesReceivedComponents(
				review.materialSnapshot,
				input.componentIds,
			)
		)
			continue;
		const scope = parseItemScope(review.assignmentScope);
		const validation = validateProductionMaterialReviewAssignmentScope(review);
		if (
			!scope.length ||
			!review.submissions.length ||
			validation.staleReasons.length ||
			(input.authorizedAssignmentIds &&
				scope.some(
					(item) =>
						!item.assignmentId ||
						!input.authorizedAssignmentIds!.includes(item.assignmentId),
				))
		) {
			skippedReviewIds.push(review.id);
			continue;
		}
		const evidence = await evaluateProductionSubmissionMaterialEvidence(
			tx as Db,
			{ salesOrderId: input.salesOrderId, itemScope: scope },
		);
		if (evidence.classification.state !== "finalized") {
			skippedReviewIds.push(review.id);
			continue;
		}
		const { result } =
			await decideProductionSubmissionMaterialReviewInTransaction(
				tx as Db,
				{
					reviewId: review.id,
					expectedUpdatedAt: review.updatedAt,
					action: "RECHECK_AND_APPROVE",
				},
				{ id: input.actorId, name: String(input.actorId) },
				{
					repairReceivedInboundNeeds: async () => ({
						inboundIds: [],
						changedCount: 0,
						updatedDemandCount: 0,
						recomputedComponentCount: 0,
						affectedSalesOrderIds: [],
					}),
				},
			);
		if (result.status !== "APPROVED")
			throw new AppError({
				code: "CONFLICT",
				publicMessage:
					"Production review evidence changed during receipt. Refresh and try again.",
			});
		approvedReviewIds.push(review.id);
	}
	if (approvedReviewIds.length)
		await recordFullWorkflowCompletionIfProvenInTransaction(tx, {
			salesOrderId: input.salesOrderId,
			milestone: "PRODUCTION_COMPLETED",
			actor: { id: input.actorId, name: String(input.actorId) },
		});
	return { approvedReviewIds, skippedReviewIds };
}
