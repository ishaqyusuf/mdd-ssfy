import type { Db } from "./types";
import { productionMaterialReviewScopeSubmissionSelect, validateProductionMaterialReviewAssignmentScope } from "./production-submission-review/assignment-scope";
import { isActiveReportedSubmission } from "./production-submission-review/policy";

/** Includes reports awaiting material review: those units already belong to their worker. */
export function productionReassignmentQuantities(assignment: {
 qtyAssigned: number | null; lhQty: number | null; rhQty: number | null;
 submissions: Array<{qty: number; lhQty?: number | null; rhQty?: number | null; deletedAt?: Date | null; materialReview?: {status: string} | null}>;
}) {
 const reported = assignment.submissions.filter(isActiveReportedSubmission).reduce<{qty: number; lh: number; rh: number}>((sum, row) => ({
  qty: sum.qty + Number(row.qty || Number(row.lhQty || 0) + Number(row.rhQty || 0)),
  lh: sum.lh + Number(row.lhQty || 0), rh: sum.rh + Number(row.rhQty || 0),
 }), {qty: 0, lh: 0, rh: 0});
 const assigned = {qty: Number(assignment.qtyAssigned || Number(assignment.lhQty || 0) + Number(assignment.rhQty || 0)), lh: Number(assignment.lhQty || 0), rh: Number(assignment.rhQty || 0)};
 const remaining = {qty: assigned.qty - reported.qty, lh: assigned.lh - reported.lh, rh: assigned.rh - reported.rh};
 if (Object.values(remaining).some(value => !Number.isFinite(value) || value < 0)) throw new Error("Assignment quantities need review before reassignment.");
 return {reported, remaining};
}

export async function reassignProductionInTransaction(tx: Db, input: {
 salesId: number; assignmentIds: number[]; assignedToId: number; actorId: number;
}) {
 const worker = await tx.users.findFirst({where: {id: input.assignedToId, deletedAt: null, accessRevokedAt: null, roles: {some: {role: {name: "Production"}}}}, select: {id: true}});
 if (!worker) throw new Error("Choose an active production worker.");
 let moved = 0;
 for (const id of [...new Set(input.assignmentIds)].sort((a,b) => a-b)) {
  await tx.$queryRaw`SELECT id FROM OrderItemProductionAssignments WHERE id = ${id} FOR UPDATE`;
  const assignment = await tx.orderItemProductionAssignments.findFirst({where: {id, orderId: input.salesId, deletedAt: null, item: {deletedAt: null}}, include: {submissions: {where: {deletedAt: null}, include: {materialReview: {select: {status: true}}}}}});
  if (!assignment) throw new Error("Assignment is no longer available. Refresh and try again.");
  const {reported, remaining} = productionReassignmentQuantities(assignment);
  const note = [assignment.note, `Reassigned ${remaining.qty} unsubmitted units from worker ${assignment.assignedToId ?? "unassigned"} to worker ${input.assignedToId} by ${input.actorId}.`].filter(Boolean).join("\n");
  if (!remaining.qty || assignment.assignedToId === input.assignedToId) continue;
  if (reported.qty) {
   // Keep ownership and all submission/payroll identities on the original record.
   const reviews = await tx.salesProductionSubmissionMaterialReview.findMany({
    where: {status: "PENDING", submissions: {some: {assignmentId: id, deletedAt: null}}},
    select: {id: true, salesOrderId: true, submittedById: true, assignmentScope: true,
     submissions: {where: {deletedAt: null}, select: productionMaterialReviewScopeSubmissionSelect}},
   });
   const validReviews = reviews.filter(review => !validateProductionMaterialReviewAssignmentScope(review).staleReasons.length);
   const updated = await tx.orderItemProductionAssignments.update({where: {id}, data: {qtyAssigned: reported.qty, lhQty: reported.lh, rhQty: reported.rh, note}});
   // Advance verified evidence only; stale reviews remain stale. Valid legacy snapshots
   // are upgraded together so mixed legacy/modern records are never produced.
   for (const review of validReviews) {
    const {assignmentScope} = validateProductionMaterialReviewAssignmentScope(review);
    const scope = assignmentScope.map(value => {
     const source = review.submissions.find(row => row.assignmentId === value.assignmentId)?.assignment;
     if (!source) return value;
     return {...value, assignedToId: source.assignedToId, laborCost: source.laborCost,
      assignmentUpdatedAt: (source.id === id ? updated.updatedAt : source.updatedAt)?.toISOString() ?? null};
    });
    await tx.salesProductionSubmissionMaterialReview.updateMany({where: {id: review.id, status: "PENDING"}, data: {assignmentScope: scope}});
   }
   await tx.orderItemProductionAssignments.create({data: {
    orderId: assignment.orderId, itemId: assignment.itemId, salesItemControlUid: assignment.salesItemControlUid,
    salesDoorId: assignment.salesDoorId, shelfItemId: assignment.shelfItemId,
    assignedToId: input.assignedToId, assignedById: input.actorId, assignedAt: new Date(),
    qtyAssigned: remaining.qty, lhQty: remaining.lh, rhQty: remaining.rh,
    laborCost: assignment.laborCost, dueDate: assignment.dueDate,
    note: `Remaining work reassigned from assignment ${id} (worker ${assignment.assignedToId ?? "unassigned"}).`,
   }});
  } else {
   await tx.orderItemProductionAssignments.update({where: {id}, data: {assignedToId: input.assignedToId, assignedById: input.actorId, assignedAt: new Date(), startedAt: null, completedAt: null, note}});
  }
  moved += remaining.qty;
 }
 if (!moved) throw new Error("No unsubmitted work remains for reassignment to this worker.");
 return {moved};
}
