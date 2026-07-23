import { describe, expect, it } from "bun:test";
import { calculateSalesFormSummary } from "./costing";

describe("sales form costing", () => {
	it("keeps credit-card convenience charges separate from legacy grand totals", () => {
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
		expect(summary.grandTotal).toBe(100);
		expect(summary.totalWithCcc).toBe(103.5);
	});

	it("charges ccc on the full principal including delivery and other costs", () => {
		const summary = calculateSalesFormSummary({
			strategy: "legacy",
			taxRate: 10,
			paymentMethod: "Credit Card",
			cccPercentage: 3.5,
			lineItems: [{ qty: 1, unitPrice: 100, lineTotal: 100 }],
			extraCosts: [
				{ type: "Delivery", amount: 20 },
				{ type: "Other", amount: 0 },
			],
		});

		expect(summary.taxableSubTotal).toBe(120);
		expect(summary.taxTotal).toBe(12);
		expect(summary.grandTotal).toBe(132);
		expect(summary.ccc).toBe(4.62);
		expect(summary.totalWithCcc).toBe(136.62);
	});

	it("subtracts percentage discounts from subtotal and taxable subtotal", () => {
		const summary = calculateSalesFormSummary({
			strategy: "legacy",
			taxRate: 0,
			lineItems: [{ qty: 1, unitPrice: 100, lineTotal: 100 }],
			extraCosts: [{ type: "DiscountPercentage", amount: 10 }],
		});

		expect(summary.discountPct).toBe(10);
		expect(summary.percentDiscountValue).toBe(10);
		expect(summary.adjustedSubTotal).toBe(90);
		expect(summary.grandTotal).toBe(90);
		expect(summary.totalWithCcc).toBe(90);
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

	it("uses explicit grouped service row tax flags over a stale parent flag", () => {
		const summary = calculateSalesFormSummary({
			strategy: "current",
			taxRate: 10,
			lineItems: [
				{
					qty: 2,
					unitPrice: 75,
					lineTotal: 150,
					taxxable: false,
					meta: {
						taxxable: false,
						serviceRows: [
							{ qty: 1, unitPrice: 100, taxxable: true },
							{ qty: 1, unitPrice: 50, taxxable: false },
						],
					},
				},
			],
			extraCosts: [],
		});

		expect(summary.subTotal).toBe(150);
		expect(summary.taxableSubTotal).toBe(100);
		expect(summary.taxTotal).toBe(10);
		expect(summary.grandTotal).toBe(160);
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

	it("keeps the HPT line total authoritative when shelf metadata is present", () => {
		const summary = calculateSalesFormSummary({
			strategy: "legacy",
			taxRate: 0,
			paymentMethod: "Credit Card",
			cccPercentage: 3.5,
			lineItems: [
				{
					qty: 2,
					unitPrice: 500,
					lineTotal: 1000,
					housePackageTool: {
						doors: [
							{
								totalQty: 2,
								unitPrice: 500,
								lineTotal: 1000,
							},
						],
					},
					shelfItems: [
						{
							qty: 2,
							unitPrice: 35,
							totalPrice: 70,
						},
					],
				},
			],
			extraCosts: [],
		});

		expect(summary.subTotal).toBe(1000);
		expect(summary.ccc).toBe(35);
		expect(summary.grandTotal).toBe(1000);
		expect(summary.totalWithCcc).toBe(1035);
	});
});
