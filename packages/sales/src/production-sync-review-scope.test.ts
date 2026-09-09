import { expect, test } from "bun:test";
import { planReviewScopeRefresh } from "./production-sync-review-scope";

function fixture() {
	return {
		id: 1, salesOrderId: 10, submittedById: 7,
		assignmentScope: [{ controlUid: "item-20", salesItemId: 20, assignmentId: 30, assignedToId: 8, laborCost: 5, assignmentUpdatedAt: "2026-09-08T00:00:00.000Z" }],
		submissions: [{ id: 40, qty: 4, lhQty: 0, rhQty: 0, createdAt: new Date("2026-09-08"), deletedAt: null, salesOrderId: 10, salesOrderItemId: 20, assignmentId: 30, materialReviewId: 1, submittedById: 7, meta: null,
			assignment: { id: 30, orderId: 10, itemId: 20, assignedToId: 8, laborCost: 5, salesItemControlUid: "item-20", qtyAssigned: 5, lhQty: 0, rhQty: 0, deletedAt: null, updatedAt: new Date("2026-09-09") } }],
	};
}
test("editor review recheck accepts timestamp-only drift with current capacity", () => {
	const review = fixture();
	expect(planReviewScopeRefresh(review, review.submissions)?.after[0]?.assignmentUpdatedAt).toBe("2026-09-09T00:00:00.000Z");
});
test("review recheck rejects changed owner or labor rate", () => {
	const owner = fixture(); owner.submissions[0]!.assignment.assignedToId = 9;
	expect(planReviewScopeRefresh(owner, owner.submissions)).toBeNull();
	const rate = fixture(); rate.submissions[0]!.assignment.laborCost = 6;
	expect(planReviewScopeRefresh(rate, rate.submissions)).toBeNull();
});
test("review recheck includes sibling submissions in assignment capacity", () => {
	const review = fixture();
	expect(planReviewScopeRefresh(review, [...review.submissions, { assignmentId: 30, qty: 2, lhQty: 0, rhQty: 0 }])).toBeNull();
});
