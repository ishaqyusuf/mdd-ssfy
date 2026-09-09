import {describe, expect, it, mock} from "bun:test";
import {productionReassignmentQuantities, reassignProductionInTransaction} from "./production-reassignment";

const input = {salesId: 42, assignmentIds: [7], assignedToId: 9, actorId: 1};
function fixture(submissions: Array<Record<string, unknown>> = []) {
 const operations: string[] = [];
 const before = new Date("2026-09-01T12:00:00Z");
 const after = new Date("2026-09-09T12:00:00Z");
 const assignment = {id: 7, orderId: 42, itemId: 3, assignedToId: 2, qtyAssigned: 10, lhQty: 6, rhQty: 4, laborCost: 12, dueDate: before, updatedAt: before, salesItemControlUid: "item-3", submissions};
 const tx = {
  users: {findFirst: mock(async () => ({id: 9}))},
  $queryRaw: mock(async () => {operations.push("lock"); return [{id: 7}];}),
  orderItemProductionAssignments: {
   findFirst: mock(async (_args: {where: {orderId: number}}) => {operations.push("read"); return assignment;}),
   update: mock(async (_args: {where: {id: number}; data: Record<string, unknown>}) => ({...assignment, updatedAt: after})),
   create: mock(async (_args: {data: Record<string, unknown>}) => ({id: 8})),
  },
  salesProductionSubmissionMaterialReview: {
   findMany: mock(async () => [{id: 12, salesOrderId: 42, submittedById: 2,
    assignmentScope: [{controlUid: "item-3", salesItemId: 3, assignmentId: 7, assignedToId: 2, laborCost: 12, assignmentUpdatedAt: before.toISOString()}],
    submissions: [{id: 1, qty: 4, lhQty: 3, rhQty: 1, createdAt: new Date("2026-09-02T12:00:00Z"), deletedAt: null, salesOrderId: 42, salesOrderItemId: 3, assignmentId: 7, materialReviewId: 12, submittedById: 2, meta: null, assignment: {...assignment, deletedAt: null}}],
   }]),
   updateMany: mock(async (_args: {data: {assignmentScope: unknown}}) => ({count: 1})),
  },
 };
 return {tx, operations, before, after};
}
describe("production reassignment", () => {
 it("moves all unreported work without creating another assignment", async () => {
  const {tx, operations} = fixture();
  expect(await reassignProductionInTransaction(tx as never, input)).toEqual({moved: 10});
  expect(operations).toEqual(["lock", "read"]);
  expect(tx.orderItemProductionAssignments.update.mock.calls[0][0].data.assignedToId).toBe(9);
  expect(tx.orderItemProductionAssignments.create).not.toHaveBeenCalled();
 });
 it("splits the handed remainder and preserves pending-review ownership, labor and schedule", async () => {
  const {tx, before, after} = fixture([{qty: 4, lhQty: 3, rhQty: 1, materialReview: {status: "PENDING"}}]);
  expect(await reassignProductionInTransaction(tx as never, input)).toEqual({moved: 6});
  expect(tx.orderItemProductionAssignments.update.mock.calls[0][0].data).toMatchObject({qtyAssigned: 4, lhQty: 3, rhQty: 1});
  expect(tx.orderItemProductionAssignments.create.mock.calls[0][0].data).toMatchObject({assignedToId: 9, qtyAssigned: 6, lhQty: 3, rhQty: 3, laborCost: 12, dueDate: before});
  expect(tx.salesProductionSubmissionMaterialReview.updateMany.mock.calls[0][0].data.assignmentScope).toMatchObject([{assignmentId: 7, assignedToId: 2, assignmentUpdatedAt: after.toISOString()}]);
 });
 it("upgrades verified legacy review snapshots after splitting", async () => {
  const {tx, after} = fixture([{qty: 4, lhQty: 3, rhQty: 1}]);
  const reviews = await tx.salesProductionSubmissionMaterialReview.findMany();
  tx.salesProductionSubmissionMaterialReview.findMany.mockResolvedValue([{...reviews[0], assignmentScope: [{controlUid: "item-3", salesItemId: 3, assignmentId: 7}]}] as never);
  await reassignProductionInTransaction(tx as never, input);
  expect(tx.salesProductionSubmissionMaterialReview.updateMany.mock.calls[0][0].data.assignmentScope).toMatchObject([{assignedToId: 2, laborCost: 12, assignmentUpdatedAt: after.toISOString()}]);
 });
 it("does not make stale review evidence valid", async () => {
  const {tx} = fixture([{qty: 4, lhQty: 3, rhQty: 1}]);
  const reviews = await tx.salesProductionSubmissionMaterialReview.findMany();
  reviews[0].assignmentScope[0].assignmentUpdatedAt = "stale";
  tx.salesProductionSubmissionMaterialReview.findMany.mockResolvedValue(reviews);
  await reassignProductionInTransaction(tx as never, input);
  expect(tx.salesProductionSubmissionMaterialReview.updateMany).not.toHaveBeenCalled();
 });
 it("refuses a fully reported assignment even when its reports await review", async () => {
  const {tx} = fixture([{qty: 10, lhQty: 6, rhQty: 4, materialReview: {status: "PENDING"}}]);
  await expect(reassignProductionInTransaction(tx as never, input)).rejects.toThrow("No unsubmitted work");
  expect(tx.orderItemProductionAssignments.update).not.toHaveBeenCalled();
 });
 it("rejects an unavailable worker before changing assignments", async () => {
  const {tx} = fixture(); tx.users.findFirst.mockResolvedValue(null as never);
  await expect(reassignProductionInTransaction(tx as never, input)).rejects.toThrow("active production worker");
  expect(tx.orderItemProductionAssignments.update).not.toHaveBeenCalled();
 });
 it("rejects missing or wrong-order assignments", async () => {
  const {tx} = fixture(); tx.orderItemProductionAssignments.findFirst.mockResolvedValue(null as never);
  await expect(reassignProductionInTransaction(tx as never, input)).rejects.toThrow("no longer available");
  expect(tx.orderItemProductionAssignments.findFirst.mock.calls[0][0].where.orderId).toBe(42);
 });
 it("ignores cancelled/rejected/deleted reports and preserves approved reports", () => {
  expect(productionReassignmentQuantities({qtyAssigned: 10, lhQty: 0, rhQty: 0, submissions: [
   {qty: 2, materialReview: {status: "APPROVED"}}, {qty: 3, materialReview: {status: "REJECTED"}}, {qty: 3, materialReview: {status: "CANCELLED"}}, {qty: 2, deletedAt: new Date()},
  ]})).toEqual({reported: {qty: 2, lh: 0, rh: 0}, remaining: {qty: 8, lh: 0, rh: 0}});
 });
 it("refuses inconsistent quantities", () => {
  expect(() => productionReassignmentQuantities({qtyAssigned: 2, lhQty: 0, rhQty: 0, submissions: [{qty: 3}]})).toThrow("need review");
 });
});
