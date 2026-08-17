import { describe, expect, it } from "bun:test";
import type { PrintSalesData } from "../query";
import { composeFooter } from "./footer";

function createSale(overrides: Partial<PrintSalesData> = {}): PrintSalesData {
	return {
		subTotal: 100,
		tax: 0,
		grandTotal: 100,
		amountDue: 100,
		meta: {},
		payments: [],
		taxes: [],
		extraCosts: [],
		...overrides,
	} as PrintSalesData;
}

describe("composeFooter", () => {
	it("prints canonical Delivery and Labor extra costs once when legacy metadata mirrors them", () => {
		const footer = composeFooter(
			createSale({
				meta: {
					deliveryCost: 35,
					labor_cost: 20,
				},
				extraCosts: [
					{ type: "Delivery", label: "Delivery", amount: 35 },
					{ type: "Labor", label: "Labor", amount: 20 },
				] as PrintSalesData["extraCosts"],
			}),
			"invoice",
		);

		expect(footer?.lines.filter((line) => line.label === "Delivery")).toEqual([
			expect.objectContaining({ value: "$35.00" }),
		]);
		expect(footer?.lines.filter((line) => line.label === "Labor")).toEqual([
			expect.objectContaining({ value: "$20.00" }),
		]);
	});

	it("keeps legacy-only Delivery and Labor metadata printable", () => {
		const footer = composeFooter(
			createSale({
				meta: {
					deliveryCost: 35,
					labor_cost: 20,
				},
			}),
			"invoice",
		);

		expect(footer?.lines.filter((line) => line.label === "Delivery")).toEqual([
			expect.objectContaining({ value: "$35.00" }),
		]);
		expect(footer?.lines.filter((line) => line.label === "Labor")).toEqual([
			expect.objectContaining({ value: "$20.00" }),
		]);
	});
});
