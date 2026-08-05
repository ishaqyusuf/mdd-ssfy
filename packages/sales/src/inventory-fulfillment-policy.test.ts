import { describe, expect, test } from "bun:test";

import {
	assertInventoryFulfillmentLineSelection,
	assertInventoryFulfillmentMutableSale,
	isInventoryFulfillmentTerminalSale,
	resolveInventoryFulfillmentDeliveryMode,
} from "./inventory-fulfillment-policy";

describe("inventory fulfillment policy", () => {
	test("locks fulfilled and cancelled sales", () => {
		expect(isInventoryFulfillmentTerminalSale({ orderStatus: "completed" })).toBe(
			true,
		);
		expect(isInventoryFulfillmentTerminalSale({ orderStatus: "cancelled" })).toBe(
			true,
		);
		expect(() =>
			assertInventoryFulfillmentMutableSale({ orderStatus: "delivered" }),
		).toThrow("read-only");
		expect(
			assertInventoryFulfillmentMutableSale({ orderStatus: "processing" }),
		).not.toBe("fulfilled");
	});

	test("uses only canonical delivery modes", () => {
		expect(
			resolveInventoryFulfillmentDeliveryMode({ orderDefault: "pickup" }),
		).toBe("pickup");
		expect(
			resolveInventoryFulfillmentDeliveryMode({
				requested: "ship",
				orderDefault: "pickup",
			}),
		).toBe("ship");
		expect(() =>
			resolveInventoryFulfillmentDeliveryMode({
				orderDefault: "inventory_partial",
			}),
		).toThrow("Choose pickup, delivery, or ship");
	});

	test("rejects line selections outside the sale", () => {
		expect(() =>
			assertInventoryFulfillmentLineSelection({
				requestedLineItemIds: [10, 20],
				selectedLineItemIds: [10],
			}),
		).toThrow("do not belong to this sale");
		expect(() =>
			assertInventoryFulfillmentLineSelection({
				requestedLineItemIds: [10, 10],
				selectedLineItemIds: [10],
			}),
		).not.toThrow();
	});
});
