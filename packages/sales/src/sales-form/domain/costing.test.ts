import { describe, expect, it } from "bun:test";
import { calculateSalesFormSummary } from "./costing";

describe("sales form costing", () => {
	it("includes credit-card convenience charges in legacy grand totals", () => {
		const summary = calculateSalesFormSummary({
			strategy: "legacy",
			taxRate: 0,
			paymentMethod: "Credit Card",
			cccPercentage: 3.5,
			lineItems: [
				{
					qty: 1,
					unitPrice: 100,
					lineTotal: 100,
				},
			],
			extraCosts: [],
		});

		expect(summary.subTotal).toBe(100);
		expect(summary.ccc).toBe(3.5);
		expect(summary.grandTotal).toBe(103.5);
	});

	it("reads service taxability and derived labor from JSON metadata", () => {
		const summary = calculateSalesFormSummary({
			strategy: "legacy",
			taxRate: 10,
			lineItems: [
				{
					qty: 1,
					unitPrice: 100,
					lineTotal: 100,
					formSteps: [
						{
							step: { title: "Item Type" },
							value: "Service",
						},
					],
					meta: JSON.stringify({
						taxxable: false,
						serviceRows: [
							{
								qty: 2,
								meta: JSON.stringify({
									unitLabor: 15,
									laborQty: 3,
								}),
							},
						],
						mouldingRows: [
							{
								qty: 4,
								meta: JSON.stringify({
									laborConfig: { rate: 5 },
									laborQty: 2,
								}),
							},
						],
					}),
				},
			],
			extraCosts: [],
		});

		expect(summary.subTotal).toBe(100);
		expect(summary.labor).toBe(55);
		expect(summary.taxableSubTotal).toBe(0);
		expect(summary.taxTotal).toBe(0);
		expect(summary.grandTotal).toBe(155);
	});

	it("derives shelf totals from JSON row price metadata", () => {
		const summary = calculateSalesFormSummary({
			strategy: "current",
			taxRate: 0,
			lineItems: [
				{
					qty: 1,
					unitPrice: 0,
					lineTotal: null,
					shelfItems: [
						{
							qty: 3,
							meta: JSON.stringify({
								customPrice: 12,
								salesPrice: 20,
							}),
						},
					],
				},
			],
			extraCosts: [],
		});

		expect(summary.subTotal).toBe(36);
		expect(summary.adjustedSubTotal).toBe(36);
		expect(summary.grandTotal).toBe(36);
	});
});
