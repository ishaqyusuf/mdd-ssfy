import { type Db, Prisma, type TransactionClient } from "@gnd/db";
import { AppError } from "@gnd/errors";
import { productionMaterialReviewScopeSubmissionSelect, validateProductionMaterialReviewAssignmentScope } from "./production-submission-review/assignment-scope";

type Review = {
	id: number; salesOrderId: number; submittedById: number; assignmentScope: unknown;
	submissions: Prisma.OrderProductionSubmissionsGetPayload<{ select: typeof productionMaterialReviewScopeSubmissionSelect }>[];
};
type Quantity = { assignmentId: number | null; qty: number; lhQty: number | null; rhQty: number | null };

/** An editor may recheck timestamp-only drift against the current assignment contract. */
export function planReviewScopeRefresh(review: Review, allSubmissions: Quantity[]) {
	const validation = validateProductionMaterialReviewAssignmentScope(review);
	if (validation.scopeMode !== "modern" || !validation.staleReasons.length || validation.staleReasons.some(reason => !/^assignment:\d+:revision$/.test(reason))) return null;
	const rows = validation.assignmentScope.map(snapshot => {
		const assignment = review.submissions.find(submission => submission.assignmentId === snapshot.assignmentId)?.assignment;
		if (!assignment?.updatedAt || assignment.laborCost !== snapshot.laborCost) return null;
		const quantities = allSubmissions.filter(row => row.assignmentId === assignment.id);
		if (!quantities.length || quantities.some(row => !Number.isFinite(row.qty) || row.qty <= 0 || !Number.isFinite(row.lhQty ?? 0) || (row.lhQty ?? 0) < 0 || !Number.isFinite(row.rhQty ?? 0) || (row.rhQty ?? 0) < 0)) return null;
		const qty = quantities.reduce((sum,row) => sum + ((row.lhQty ?? 0) + (row.rhQty ?? 0) || row.qty),0);
		const lh = quantities.reduce((sum,row) => sum + (row.lhQty ?? 0),0);
		const rh = quantities.reduce((sum,row) => sum + (row.rhQty ?? 0),0);
		if (qty > Number(assignment.qtyAssigned) || lh > Number(assignment.lhQty) || rh > Number(assignment.rhQty)) return null;
		return { ...snapshot, assignmentUpdatedAt: assignment.updatedAt.toISOString() };
	});
	if (rows.some(row => !row)) return null;
	return { reviewId: review.id, before: review.assignmentScope, after: rows.filter(row => row !== null) };
}

export async function getReviewScopeRefreshes(db: Db | TransactionClient, reviews: Review[]) {
	const assignmentIds = [...new Set(reviews.flatMap(review => review.submissions.flatMap(row => row.assignmentId ? [row.assignmentId] : [])))];
	if (!assignmentIds.length) return { rows: [], evidence: [] };
	const evidence = await db.orderProductionSubmissions.findMany({ where: { assignmentId: { in: assignmentIds }, deletedAt: null, OR: [{ materialReviewId: null }, { materialReview: { status: { in: ["PENDING", "APPROVED"] } } }] }, select: { id: true, assignmentId: true, qty: true, lhQty: true, rhQty: true }, orderBy: { id: "asc" } });
	return { rows: reviews.flatMap(review => { const row = planReviewScopeRefresh(review,evidence); return row ? [row] : []; }), evidence };
}

export async function applyReviewScopeRefreshes(tx: Db | TransactionClient, rows: Awaited<ReturnType<typeof getReviewScopeRefreshes>>["rows"]) {
	for (const row of rows) {
		const updated = await tx.salesProductionSubmissionMaterialReview.updateMany({ where: { id: row.reviewId, status: "PENDING" }, data: { assignmentScope: row.after as Prisma.InputJsonValue } });
		if (updated.count !== 1) throw new AppError({ code: "CONFLICT", publicMessage: "Submitted work changed. Refresh and try again." });
	}
}
