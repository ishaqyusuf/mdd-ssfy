import { describe, expect, test } from "bun:test";

import {
	dispatchItemQuantity,
	resolveDispatchInventoryScope,
	scaleDispatchComponentQuantity,
} from "./inventory-quantities";

describe("dispatch inventory quantities", () => {
	test("uses handing quantities when a prehung row has no scalar quantity", () => {
		expect(dispatchItemQuantity({ qty: 0, lhQty: 2, rhQty: 1 })).toBe(3);
	});

	test("scopes a component requirement to the quantity on this trip", () => {
		expect(
			scaleDispatchComponentQuantity({
				componentQty: 8,
				orderedItemQty: 4,
				dispatchItemQty: 1,
			}),
		).toBe(2);
	});

	test("never reserves more than the sales-line component requirement", () => {
		expect(
			scaleDispatchComponentQuantity({
				componentQty: 8,
				orderedItemQty: 4,
				dispatchItemQty: 10,
			}),
		).toBe(8);
	});

	test("uses exact requested or delivery item quantities when present", () => {
		expect(
			resolveDispatchInventoryScope({
				lineSalesItemIds: [10, 11],
				orderDeliveryId: 77,
				requestedItems: [{ salesItemId: 11, qty: 2 }],
				deliveryItems: [{ salesItemId: 10, qty: 5 }],
				activeDispatchIds: [77],
			}),
		).toMatchObject({
			source: "requested_items",
			resolved: true,
			salesItemIds: [11],
		});
	});

	test("only falls back to all inventory lines for the sole active dispatch", () => {
		expect(
			resolveDispatchInventoryScope({
				lineSalesItemIds: [10, 11],
				orderDeliveryId: 77,
				activeDispatchIds: [77],
			}),
		).toMatchObject({
			source: "sole_active_dispatch",
			resolved: true,
			salesItemIds: [10, 11],
		});
		expect(
			resolveDispatchInventoryScope({
				lineSalesItemIds: [10, 11],
				orderDeliveryId: 77,
				activeDispatchIds: [77, 88],
			}),
		).toMatchObject({
			source: "unresolved",
			resolved: false,
			salesItemIds: [],
		});
	});
});
