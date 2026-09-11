import { expect, test } from "bun:test";
import { buildFulfillmentShortLoadPlan } from "./fulfillment-short-load-plan";
import { projectPersistedFulfillmentQuantities } from "./fulfillment-assignment-scope";
const meta = {
	fulfillmentAssignment: {
		version: 1,
		revision: 1,
		selectionMode: "selected",
		lines: [{ uid: "a", quantity: { qty: 5, lh: 0, rh: 0 } }],
	},
};
const packed = [{ uid: "a", quantity: { qty: 3, lh: 0, rh: 0 } }];
test("confirmed short load releases two and preserves original scope for audit", () => {
	const plan = buildFulfillmentShortLoadPlan({
		meta,
		expectedScopeRevision: 1,
		lines: packed,
	});
	expect(plan.releasedQty).toBe(2);
	expect(plan.originalScope.lines[0]?.quantity.qty).toBe(5);
	expect(plan.scope.revision).toBe(2);
	const projection = projectPersistedFulfillmentQuantities({
		lines: [{ uid: "a", salesItemId: 1, size: null, ordered: { qty: 5, lh: 0, rh: 0 } }],
		deliveries: [
			{
				id: 1,
				status: "packed",
				meta: { fulfillmentAssignment: plan.scope },
				packed,
				proofCompleted: false,
				inventoryCommitted: false,
			},
		],
	});
	expect(projection.backlogQty).toBe(2);
	expect(projection.lines[0]?.assigned.qty).toBe(3);
});
test("reconfirmed unchanged physical load does not release twice or increment revision", () => {
	const first = buildFulfillmentShortLoadPlan({
		meta,
		expectedScopeRevision: 1,
		lines: packed,
	});
	const next = buildFulfillmentShortLoadPlan({
		meta: { fulfillmentAssignment: first.scope },
		expectedScopeRevision: 2,
		lines: packed,
	});
	expect(next.changed).toBe(false);
	expect(next.releasedQty).toBe(0);
	expect(next.scope.revision).toBe(2);
	expect(() =>
		buildFulfillmentShortLoadPlan({
			meta: { fulfillmentAssignment: first.scope },
			expectedScopeRevision: 1,
			lines: packed,
		}),
	).toThrow("Refresh");
});
