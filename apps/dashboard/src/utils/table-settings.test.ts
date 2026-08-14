import { describe, expect, it } from "bun:test";
import { normalizeColumnOrder } from "./table-settings";

describe("table settings column order normalization", () => {
	it("prunes removed Sales Orders columns from persisted order", () => {
		expect(
			normalizeColumnOrder(
				["select", "orderId", "specialOrder", "status", "actions"],
				["select", "orderId", "status", "actions"],
			),
		).toEqual(["select", "orderId", "status", "actions"]);
	});
});
