import type { Prisma } from "@gnd/db";

import { resetSalesAction } from "../sales-control/actions";
import type { Db } from "../types";
import { createProductionPayrollForSubmissions } from "./decision";
import { isActiveReportedSubmission } from "./policy";
import {
	normalizeProductionSubmissionItemScope,
	prepareProductionSubmissionMaterialReview,
} from "./service";

export type SubmitProductionAssignmentInput = {
	salesOrderId: number;
	salesOrderItemId: number;
	assignmentId: number;
	submittedById: number;
	idempotencyKey: string;
	qty: number;
	lhQty?: number | null;
	rhQty?: number | null;
	note?: string | null;
	meta?: Prisma.InputJsonValue;
	allowSubmitForOthers?: boolean;
};

export async function submitProductionAssignmentInTransaction(
	tx: Db,
	input: SubmitProductionAssignmentInput,
) {
	const existingReview =
		await tx.salesProductionSubmissionMaterialReview.findUnique({
			where: { idempotencyKey: input.idempotencyKey },
			select: {
				id: true,
				salesOrderId: true,
				submittedById: true,
				status: true,
				assignmentScope: true,
				submissions: {
					where: {
						assignmentId: input.assignmentId,
						deletedAt: null,
					},
					select: {
						id: true,
						salesOrderId: true,
						salesOrderItemId: true,
						assignmentId: true,
						submittedById: true,
						qty: true,
						lhQty: true,
						rhQty: true,
					},
					take: 1,
				},
			},
		});
	if (existingReview) {
		const reviewScope = normalizeProductionSubmissionItemScope(
			existingReview.assignmentScope,
		);
		const matchingScope = reviewScope.filter(
			(scope) =>
				scope.assignmentId === input.assignmentId &&
				scope.salesItemId === input.salesOrderItemId,
		);
		const existingSubmission = existingReview.submissions[0];
		const requestMatches =
			existingReview.salesOrderId === input.salesOrderId &&
			existingReview.submittedById === input.submittedById &&
			reviewScope.length === 1 &&
			matchingScope.length === 1 &&
			existingSubmission?.salesOrderId === input.salesOrderId &&
			existingSubmission.salesOrderItemId === input.salesOrderItemId &&
			existingSubmission.assignmentId === input.assignmentId &&
			existingSubmission.submittedById === input.submittedById &&
			Number(existingSubmission.qty) === Number(input.qty) &&
			Number(existingSubmission.lhQty || 0) === Number(input.lhQty || 0) &&
			Number(existingSubmission.rhQty || 0) === Number(input.rhQty || 0);
		if (!requestMatches) {
			throw new Error(
				"Production submission idempotency key belongs to another request.",
			);
		}
		if (
			existingReview.status === "REJECTED" ||
			existingReview.status === "CANCELLED"
		) {
			throw new Error(
				"Production submission idempotency key belongs to a closed review. Start a new submission.",
			);
		}
		return {
			submissionId: existingSubmission.id,
			state:
				existingReview.status === "APPROVED"
					? ("finalized" as const)
					: ("pending_material_review" as const),
			reviewId: existingReview.id,
			idempotentReplay: true,
		};
	}
	const assignment = await tx.orderItemProductionAssignments.findUniqueOrThrow({
		where: { id: input.assignmentId },
		select: {
			id: true,
			orderId: true,
			itemId: true,
			assignedToId: true,
			deletedAt: true,
			laborCost: true,
			salesItemControlUid: true,
			qtyAssigned: true,
			lhQty: true,
			rhQty: true,
			updatedAt: true,
			submissions: {
				where: { deletedAt: null },
				select: {
					qty: true,
					lhQty: true,
					rhQty: true,
					deletedAt: true,
					materialReview: {
						select: { status: true },
					},
				},
			},
		},
	});
	if (
		assignment.orderId !== input.salesOrderId ||
		assignment.itemId !== input.salesOrderItemId
	) {
		throw new Error(
			"Production assignment does not belong to this order item.",
		);
	}
	if (assignment.deletedAt) {
		throw new Error("Production assignment is no longer active.");
	}
	if (!assignment.assignedToId) {
		throw new Error("Production assignment must have an active assigned worker.");
	}
	if (
		!input.allowSubmitForOthers &&
		assignment.assignedToId !== input.submittedById
	) {
		throw new Error("You can only submit production assigned to you.");
	}
	const requestedQty = Number(input.qty || 0);
	const requestedLhQty = Number(input.lhQty || 0);
	const requestedRhQty = Number(input.rhQty || 0);
	if (
		!Number.isFinite(requestedQty) ||
		!Number.isFinite(requestedLhQty) ||
		!Number.isFinite(requestedRhQty) ||
		requestedQty <= 0 ||
		requestedLhQty < 0 ||
		requestedRhQty < 0
	) {
		throw new Error(
			"Production submission quantity must be greater than zero.",
		);
	}
	const itemScope = [
		{
			controlUid: assignment.salesItemControlUid || `item-${assignment.itemId}`,
			salesItemId: assignment.itemId,
			assignmentId: assignment.id,
			assignedToId: assignment.assignedToId,
			assignmentUpdatedAt: assignment.updatedAt?.toISOString() ?? null,
			laborCost: assignment.laborCost,
		},
	];
	const reported = assignment.submissions
		.filter(isActiveReportedSubmission)
		.reduce(
			(total, submission) => ({
				qty: total.qty + Number(submission.qty || 0),
				lh: total.lh + Number(submission.lhQty || 0),
				rh: total.rh + Number(submission.rhQty || 0),
			}),
			{ qty: 0, lh: 0, rh: 0 },
		);
	const remaining = {
		qty: Math.max(0, Number(assignment.qtyAssigned || 0) - reported.qty),
		lh: Math.max(0, Number(assignment.lhQty || 0) - reported.lh),
		rh: Math.max(0, Number(assignment.rhQty || 0) - reported.rh),
	};
	if (
		requestedQty > remaining.qty ||
		requestedLhQty > remaining.lh ||
		requestedRhQty > remaining.rh
	) {
		throw new Error(
			"Production submission quantity exceeds the remaining assignment quantity.",
		);
	}

	const review = await prepareProductionSubmissionMaterialReview(tx, {
		salesOrderId: input.salesOrderId,
		submittedById: input.submittedById,
		idempotencyKey: input.idempotencyKey,
		itemScope,
	});
	if (!review.reviewId) {
		throw new Error("Production material review batch was not created.");
	}
	const existingSubmission = review.reviewId
		? await tx.orderProductionSubmissions.findFirst({
				where: {
					materialReviewId: review.reviewId,
					deletedAt: null,
				},
				select: { id: true },
			})
		: null;
	if (existingSubmission) {
		return {
			submissionId: existingSubmission.id,
			state: review.state,
			reviewId: review.reviewId,
			idempotentReplay: true,
		};
	}

	const submission = await tx.orderProductionSubmissions.upsert({
		where: {
			materialReviewId_assignmentId: {
				materialReviewId: review.reviewId,
				assignmentId: input.assignmentId,
			},
		},
		create: {
			qty: input.qty,
			lhQty: input.lhQty,
			rhQty: input.rhQty,
			note: input.note,
			meta: input.meta ?? {},
			salesOrderId: input.salesOrderId,
			salesOrderItemId: input.salesOrderItemId,
			assignmentId: input.assignmentId,
			submittedById: input.submittedById,
			materialReviewId: review.reviewId,
		},
		update: {},
		select: { id: true },
	});
	if (review.state === "finalized") {
		await createProductionPayrollForSubmissions(tx, {
			salesOrderId: input.salesOrderId,
			submissions: [
				{
					id: submission.id,
					qty: input.qty,
					assignment,
				},
			],
		});
	}
	await resetSalesAction(tx, input.salesOrderId);
	return {
		submissionId: submission.id,
		state: review.state,
		reviewId: review.reviewId,
		idempotentReplay: false,
	};
}

export async function submitProductionAssignment(
	db: Db,
	input: SubmitProductionAssignmentInput,
) {
	return db.$transaction((tx) =>
		submitProductionAssignmentInTransaction(tx as Db, input),
	);
}
