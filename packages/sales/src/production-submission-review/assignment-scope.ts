import type { Prisma } from "@gnd/db";
import { normalizeProductionSubmissionItemScope } from "./service";

export const productionMaterialReviewScopeSubmissionSelect = {
	id: true,
	qty: true,
	lhQty: true,
	rhQty: true,
	createdAt: true,
	deletedAt: true,
	salesOrderId: true,
	salesOrderItemId: true,
	assignmentId: true,
	materialReviewId: true,
	submittedById: true,
	meta: true,
	assignment: {
		select: {
			id: true,
			orderId: true,
			itemId: true,
			assignedToId: true,
			laborCost: true,
			salesItemControlUid: true,
			qtyAssigned: true,
			lhQty: true,
			rhQty: true,
			deletedAt: true,
			updatedAt: true,
		},
	},
} satisfies Prisma.OrderProductionSubmissionsSelect;

type AssignmentScopeReview = {
	id: number;
	salesOrderId: number;
	submittedById: number;
	assignmentScope: unknown;
	submissions: ReadonlyArray<
		Prisma.OrderProductionSubmissionsGetPayload<{
			select: typeof productionMaterialReviewScopeSubmissionSelect;
		}>
	>;
};

type AssignmentScopeSnapshotMode = "legacy" | "modern" | "invalid";

function getAssignmentScopeSnapshotMode(
	value: unknown,
): AssignmentScopeSnapshotMode {
	if (!Array.isArray(value) || !value.length) return "invalid";
	const modes = value.map((item) => {
		if (!item || typeof item !== "object") return "invalid" as const;
		const row = item as Record<string, unknown>;
		if (
			typeof row.controlUid !== "string" ||
			!Number.isInteger(row.salesItemId) ||
			!Number.isInteger(row.assignmentId)
		) {
			return "invalid" as const;
		}
		const snapshotFields = [
			"assignedToId",
			"assignmentUpdatedAt",
			"laborCost",
		] as const;
		const present = snapshotFields.map((field) =>
			Object.prototype.hasOwnProperty.call(row, field),
		);
		if (present.every(Boolean)) return "modern" as const;
		if (present.every((fieldPresent) => !fieldPresent)) {
			return "legacy" as const;
		}
		return "invalid" as const;
	});
	if (modes.every((mode) => mode === "legacy")) return "legacy";
	if (modes.every((mode) => mode === "modern")) return "modern";
	return "invalid";
}

function validDateTimestamp(value: Date | null | undefined) {
	if (!(value instanceof Date)) return null;
	const timestamp = value.getTime();
	return Number.isFinite(timestamp) ? timestamp : null;
}

function isStatusCompletionSubmission(meta: unknown) {
	return (
		Boolean(meta) &&
		typeof meta === "object" &&
		!Array.isArray(meta) &&
		(meta as Record<string, unknown>).source === "sales_mark_as_completed"
	);
}

/** Same assignment-proof gate for read preflight and transactional decisions. */
export function validateProductionMaterialReviewAssignmentScope(
	review: AssignmentScopeReview,
	allowEmptySubmissions = false,
) {
	const assignmentScope = normalizeProductionSubmissionItemScope(
		review.assignmentScope,
	);
	const scopeMode = getAssignmentScopeSnapshotMode(review.assignmentScope);
	const scopeAssignmentIds = assignmentScope.flatMap((scope) =>
		scope.assignmentId == null ? [] : [scope.assignmentId],
	);
	const staleReasons = [
		...(scopeMode === "invalid" ? ["review:assignment_scope_shape"] : []),
		...(!allowEmptySubmissions &&
		assignmentScope.length !== review.submissions.length
			? ["review:assignment_scope_count"]
			: []),
		...(new Set(scopeAssignmentIds).size !== scopeAssignmentIds.length
			? ["review:assignment_scope_duplicate"]
			: []),
		...review.submissions.flatMap((submission) => {
			const assignment = submission.assignment;
			const snapshot = assignmentScope.find(
				(scope) => scope.assignmentId === submission.assignmentId,
			);
			if (
				!assignment ||
				!snapshot ||
				assignment.id !== submission.assignmentId
			) {
				return [`submission:${submission.id}:scope`];
			}
			const currentRevision = assignment.updatedAt?.toISOString() ?? null;
			const submittedAt = submission.createdAt;
			const currentRevisionTimestamp = validDateTimestamp(assignment.updatedAt);
			const submittedAtTimestamp = validDateTimestamp(submittedAt);
			const qty = Number(submission.qty);
			const lhQty = Number(submission.lhQty || 0);
			const rhQty = Number(submission.rhQty || 0);
			const effectiveQty = lhQty > 0 || rhQty > 0 ? lhQty + rhQty : qty;
			const assignedQty = Number(assignment.qtyAssigned || 0);
			const assignedLhQty = Number(assignment.lhQty || 0);
			const assignedRhQty = Number(assignment.rhQty || 0);
			const currentControlUid =
				assignment.salesItemControlUid || `item-${assignment.itemId}`;
			const statusCompletionSubmission = isStatusCompletionSubmission(
				submission.meta,
			);
			return [
				review.submittedById !== submission.submittedById
					? `submission:${submission.id}:reporter`
					: null,
				submission.materialReviewId !== review.id
					? `submission:${submission.id}:review`
					: null,
				submission.salesOrderId !== review.salesOrderId
					? `submission:${submission.id}:order`
					: null,
				!Number.isFinite(qty) ||
				!Number.isFinite(effectiveQty) ||
				effectiveQty <= 0 ||
				effectiveQty > assignedQty
					? `submission:${submission.id}:qty`
					: null,
				!Number.isFinite(lhQty) || lhQty < 0 || lhQty > assignedLhQty
					? `submission:${submission.id}:lh_qty`
					: null,
				!Number.isFinite(rhQty) || rhQty < 0 || rhQty > assignedRhQty
					? `submission:${submission.id}:rh_qty`
					: null,
				assignment.deletedAt ? `assignment:${assignment.id}:deleted` : null,
				assignment.assignedToId == null && !statusCompletionSubmission
					? `assignment:${assignment.id}:unassigned`
					: null,
				assignment.orderId !== review.salesOrderId
					? `assignment:${assignment.id}:order`
					: null,
				assignment.itemId !== submission.salesOrderItemId ||
				snapshot.salesItemId !== submission.salesOrderItemId
					? `assignment:${assignment.id}:item`
					: null,
				snapshot.controlUid !== currentControlUid
					? `assignment:${assignment.id}:control`
					: null,
				scopeMode === "modern" &&
				assignment.assignedToId !== snapshot.assignedToId
					? `assignment:${assignment.id}:owner`
					: null,
				scopeMode === "modern" &&
				(!snapshot.assignmentUpdatedAt ||
					currentRevision !== snapshot.assignmentUpdatedAt)
					? `assignment:${assignment.id}:revision`
					: null,
				scopeMode === "legacy" &&
				(currentRevisionTimestamp == null || submittedAtTimestamp == null)
					? `assignment:${assignment.id}:legacy_revision_unverifiable`
					: null,
				scopeMode === "legacy" &&
				currentRevisionTimestamp != null &&
				submittedAtTimestamp != null &&
				currentRevisionTimestamp >= submittedAtTimestamp
					? `assignment:${assignment.id}:legacy_revision_not_strictly_before_submission`
					: null,
			].filter((reason): reason is string => Boolean(reason));
		}),
	];
	return { assignmentScope, scopeMode, staleReasons };
}
