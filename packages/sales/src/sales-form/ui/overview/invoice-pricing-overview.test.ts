import { describe, expect, test } from "bun:test";

import {
	createSalesFormAdditionalCost,
	salesFormAdditionalCostOptions,
} from "./invoice-pricing-overview";

describe("additional cost lines", () => {
	test("matches the legacy cost menu", () => {
		expect(salesFormAdditionalCostOptions).toEqual([
			{ label: "Discount", type: "Discount" },
			{ label: "Delivery", type: "Delivery" },
			{ label: "Flat Labor Cost", type: "FlatLabor" },
			{ label: "Custom", type: "CustomNonTaxxable" },
		]);
	});

	test("creates an editable zero-value line immediately", () => {
		expect(
			createSalesFormAdditionalCost(salesFormAdditionalCostOptions[1]),
		).toEqual({
			label: "Delivery",
			type: "Delivery",
			amount: 0,
			taxxable: false,
		});
	});
});
