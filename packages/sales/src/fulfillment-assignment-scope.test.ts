import { expect, test } from "bun:test";
import { projectPersistedFulfillmentQuantities, readFulfillmentAssignmentScope } from "./fulfillment-assignment-scope";
const quantity = { qty: 0, lh: 3, rh: 2 };
const lines = [{ uid: "door", salesItemId: 1, size: "3-0 x 6-8", ordered: { qty: 0, lh: 5, rh: 5 } }];
const scope = { version: 1, revision: 1, selectionMode: "selected", lines: [{ uid: "door", quantity }] };
const delivery = { id: 1, status: "queue", meta: { fulfillmentAssignment: scope }, packed: [], proofCompleted: false, inventoryCommitted: false };
test("persisted plan reserves units before physical packing exists", () => {
	const result = projectPersistedFulfillmentQuantities({ lines, deliveries: [delivery] });
	expect(result.backlogQty).toBe(5);
	expect(result.lines[0]?.packed).toEqual({ qty: 0, lh: 0, rh: 0 });
});
test("completed status alone cannot free a reservation or count delivery", () => {
	const result = projectPersistedFulfillmentQuantities({ lines, deliveries: [{ ...delivery, status: "completed", packed: [{ uid: "door", quantity }] }] });
	expect(result.resolved).toBe(false);
	expect(result.lines[0]?.delivered).toEqual({ qty: 0, lh: 0, rh: 0 });
	expect(result.backlogQty).toBe(0);
});
test("proven completed legacy packing counts once without requiring a plan", () => {
	const result = projectPersistedFulfillmentQuantities({ lines, deliveries: [{ ...delivery, meta: {}, status: "completed", proofCompleted: true, inventoryCommitted: true, packed: [{ uid: "door", quantity }] }] });
	expect(result.resolved).toBe(true);
	expect(result.backlogQty).toBe(5);
});
test("deleted legacy work does not block remainder", () => {
	expect(projectPersistedFulfillmentQuantities({ lines, deliveries: [{ ...delivery, meta: {}, deletedAt: new Date() }] }).backlogQty).toBe(10);
});
test("duplicate and malformed persisted scope are rejected", () => {
	expect(readFulfillmentAssignmentScope({ fulfillmentAssignment: { ...scope, lines: [...scope.lines, ...scope.lines] } }).state).toBe("invalid");
	expect(readFulfillmentAssignmentScope({ fulfillmentAssignment: { ...scope, version: 2 } }).state).toBe("invalid");
	expect(readFulfillmentAssignmentScope({ fulfillmentAssignment: { ...scope, lines: [{ uid: "door", quantity: { qty: 5, lh: 3, rh: 2 } }] } }).state).toBe("invalid");
});
