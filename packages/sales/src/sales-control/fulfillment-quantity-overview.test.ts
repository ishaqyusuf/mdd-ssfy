import { expect, test } from "bun:test";
import { buildFulfillmentQuantityOverview } from "./fulfillment-quantity-overview";
const item = { controlUid: "door-small", itemId: 1, size: "2-0 x 6-8", qty: { qty: 10, lh: 5, rh: 5 }, itemConfig: { shipping: true } };
const header = { id: 1, status: "completed", meta: { dispatchCompletion: { status: "completed" } }, _count: { stockAllocations: 0 } };
const packing = { orderDeliveryId: 1, orderItemId: 1, packingStatus: "packed", qty: 5, lhQty: 3, rhQty: 2, submission: { assignment: { salesItemControlUid: "door-small" } } };
test("overview preserves handed total and completed physical evidence", () => {
	const result = buildFulfillmentQuantityOverview({ items: [item], headers: [header], packing: [packing] });
	expect(result.resolved).toBe(true);
	expect(result.backlogQty).toBe(5);
	expect(result.lines[0]?.delivered).toEqual({ qty: 0, lh: 3, rh: 2 });
});
test("legacy packing cannot choose the first size of a multi-size sales item", () => {
	const result = buildFulfillmentQuantityOverview({ items: [item, { ...item, controlUid: "door-large", size: "3-0 x 6-8" }], headers: [header], packing: [{ ...packing, submission: null }] });
	expect(result.conflicts.some((c) => c.code === "PACKING_LINE_IDENTITY_UNKNOWN")).toBe(true);
	expect(result.backlogQty).toBe(0);
});
test("unpacked history does not count toward delivery", () => {
	const result = buildFulfillmentQuantityOverview({ items: [item], headers: [header], packing: [{ ...packing, packingStatus: "unpacked" }] });
	expect(result.lines[0]?.delivered).toEqual({ qty: 0, lh: 0, rh: 0 });
});
test("inventory component evidence is not assumed to be sales units", () => {
	const result = buildFulfillmentQuantityOverview({ items: [item], headers: [{ ...header, _count: { stockAllocations: 2 } }], packing: [] });
	expect(result.resolved).toBe(false);
	expect(result.backlogQty).toBe(0);
});

test("inventory dispatch sales-unit packing is counted once after canonical commitment", () => {
 const result = buildFulfillmentQuantityOverview({ items: [item], headers: [{ ...header, meta: { dispatchCompletion: { status: "completed" }, inventoryDispatch: { status: "consumed" } }, _count: { stockAllocations: 3 } }], packing: [packing] });
 expect(result.resolved).toBe(true);
 expect(result.backlogQty).toBe(5);
 expect(result.lines[0]?.delivered).toEqual({ qty: 0, lh: 3, rh: 2 });
});
