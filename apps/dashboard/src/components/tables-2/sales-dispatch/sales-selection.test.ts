import { describe, expect, it } from "bun:test";

import { getDispatchSalesSelection } from "./sales-selection";

describe("dispatch sales selection", () => {
	it("maps selected dispatches to the underlying sales orders", () => {
		expect(
			getDispatchSalesSelection([
				{ status: "queue", order: { id: 41, orderId: "08841LM" } },
				{ status: "packed", order: { id: 42, orderId: "08842PC" } },
			]),
		).toEqual({
			salesIds: [41, 42],
			salesRefs: [
				{ orderNo: "08841LM", salesId: 41, salesType: "order" },
				{ orderNo: "08842PC", salesId: 42, salesType: "order" },
			],
		});
	});

	it("deduplicates orders and excludes terminal or invalid dispatch rows", () => {
		expect(
			getDispatchSalesSelection([
				{ status: "queue", order: { id: 41, orderId: "08841LM" } },
				{ status: "in progress", order: { id: 41, orderId: "08841LM" } },
				{ status: "missing items", order: { id: 41, orderId: "08841LM" } },
				{ status: "completed", order: { id: 42, orderId: "08842PC" } },
				{ status: "cancelled", order: { id: 43, orderId: "08843PC" } },
				{ status: "queue", order: null },
				{ status: "queue", order: { id: 44, orderId: null } },
			]),
		).toEqual({
			salesIds: [41],
			salesRefs: [{ orderNo: "08841LM", salesId: 41, salesType: "order" }],
		});
	});
});
