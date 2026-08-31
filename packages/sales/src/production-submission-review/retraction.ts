import type { Db } from "../types";
import { normalizeProductionSubmissionItemScope } from "./service";

type RetractedSubmission = {
	id: number;
	assignmentId: number | null;
	materialReviewId: number | null;
};

export async function reconcileMaterialReviewsAfterSubmissionRetraction(
	db: Db,
	input: {
		salesOrderId: number;
		retractedSubmissions: RetractedSubmission[];
		actor: { id: number; name: string };
	},
) {
	const retractedByReview = new Map<number, RetractedSubmission[]>();
	for (const submission of input.retractedSubmissions) {
		if (!submission.materialReviewId) continue;
		const current = retractedByReview.get(submission.materialReviewId) || [];
		current.push(submission);
		retractedByReview.set(submission.materialReviewId, current);
	}

	const refreshedReviewIds: number[] = [];
	for (const [reviewId, retractedSubmissions] of retractedByReview) {
		const review = await db.salesProductionSubmissionMaterialReview.findUnique({
			where: { id: reviewId },
			select: {
				id: true,
				salesOrderId: true,
				status: true,
				assignmentScope: true,
				submissions: {
					where: { deletedAt: null },
					select: { id: true, assignmentId: true },
				},
			},
		});
		if (!review || review.salesOrderId !== input.salesOrderId) continue;

		if (review.status === "PENDING" && !review.submissions.length) {
			const refreshed =
				await db.salesProductionSubmissionMaterialReview.updateMany({
					where: { id: review.id, status: "PENDING" },
					data: {
						decisionNote:
							"The production worker retracted the submitted work. Material resolution may continue without restoring production quantity.",
						resolution: {
							action: "SUBMISSION_RETRACTED",
							retractedSubmissionIds: retractedSubmissions.map(
								(submission) => submission.id,
							),
							retractedById: input.actor.id,
						},
					},
				});
			if (refreshed.count === 1) refreshedReviewIds.push(review.id);
		} else if (review.status === "PENDING") {
			const activeAssignmentIds = new Set(
				review.submissions.flatMap((submission) =>
					submission.assignmentId == null ? [] : [submission.assignmentId],
				),
			);
			const assignmentScope = normalizeProductionSubmissionItemScope(
				review.assignmentScope,
			).filter(
				(scope) =>
					scope.assignmentId == null ||
					activeAssignmentIds.has(scope.assignmentId),
			);
			const refreshed =
				await db.salesProductionSubmissionMaterialReview.updateMany({
					where: { id: review.id, status: "PENDING" },
					data: { assignmentScope },
				});
			if (refreshed.count === 1) refreshedReviewIds.push(review.id);
		}

		await db.salesHistory.create({
			data: {
				salesId: input.salesOrderId,
				name: "Production submission retracted",
				authorName: input.actor.name,
				data: {
					event: "production_submission_retracted",
					reviewId: review.id,
					reviewStatusBefore: review.status,
					reviewStatusAfter: review.status,
					submissionIds: retractedSubmissions.map(
						(submission) => submission.id,
					),
					actorId: input.actor.id,
				},
			},
		});
	}

	return { refreshedReviewIds };
}
