import { expect, test } from "bun:test";
import { orderOwnedDoorRows } from "./order-owned-door-rows";

test("reused house package IDs do not restore orphan doors from another order", () => {
	const rows = [
		{ id: 1, salesOrderId: 10, totalQty: 6 },
		{ id: 2, salesOrderId: 20, totalQty: 2 },
		{ id: 3, salesOrderId: null, totalQty: 3 },
	];
	expect(orderOwnedDoorRows(rows, 20)).toEqual([rows[1]!]);
	expect(rows).toHaveLength(3);
});
