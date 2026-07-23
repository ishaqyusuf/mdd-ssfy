import { describe, expect, test } from "bun:test";

import { CostingClass } from "./costing-class";
import type { SettingsClass } from "./settings-class";

interface PricingLine {
	totalPrice: number;
	type: string;
	taxable?: boolean;
}

interface CostingOptions {
	delivery?: number;
	discount?: number;
	discountPercentage?: number;
	extraCost?: number;
	paymentMethod?: string;
	taxPercentage?: number;
}

function createCosting(lines: PricingLine[], options: CostingOptions = {}) {
	const extraCosts = [{ type: "Labor", amount: 0 }];
	if (options.discount)
		extraCosts.push({ type: "Discount", amount: options.discount });
	if (options.discountPercentage)
		extraCosts.push({
			type: "DiscountPercentage",
			amount: options.discountPercentage,
		});
	if (options.extraCost)
		extraCosts.push({ type: "Other", amount: options.extraCost });

	const state = {
		metaData: {
			pricing: {
				delivery: options.delivery || 0,
			},
			extraCosts,
			paymentMethod: options.paymentMethod || null,
			salesLaborConfig: {},
			tax: {
				percentage: options.taxPercentage ?? 7,
			},
		},
		kvFormItem: Object.fromEntries(
			lines.map((line, index) => [
				`line-${index}`,
				{
					groupItem: {
						type: line.type,
						form: {
							value: {
								selected: true,
								pricing: {
									totalPrice: line.totalPrice,
								},
								meta: {
									taxxable: line.taxable,
								},
							},
						},
					},
				},
			]),
		),
		setting: {
			setting: {
				data: {
					ccc: 3.5,
				},
			},
		},
	};
	const setting = {
		staticZus: state,
		zus: state,
	};

	return {
		costing: new CostingClass(setting as unknown as SettingsClass),
		state,
	};
}

function expectPricing(
	state: ReturnType<typeof createCosting>["state"],
	expected: Record<string, number>,
) {
	const pricing = state.metaData.pricing as unknown as Record<string, number>;

	for (const [field, value] of Object.entries(expected))
		expect(pricing[field]).toBe(value);
}

describe("CostingClass tax calculation", () => {
	test("excludes an unchecked service line from tax", () => {
		const { costing, state } = createCosting([
			{
				totalPrice: 7000,
				type: "SERVICE",
				taxable: false,
			},
		]);

		costing.calculateTotalPrice();

		expectPricing(state, {
			subTotal: 7000,
			taxxable: 0,
			taxValue: 0,
			grandTotal: 7000,
		});
	});

	test("charges tax for a checked service line", () => {
		const { costing, state } = createCosting([
			{
				totalPrice: 7000,
				type: "SERVICE",
				taxable: true,
			},
		]);

		costing.calculateTotalPrice();

		expectPricing(state, {
			subTotal: 7000,
			taxxable: 7000,
			taxValue: 490,
			grandTotal: 7490,
		});
	});

	test("treats a sparse service row without metadata as non-taxable", () => {
		const { costing, state } = createCosting([
			{
				totalPrice: 100,
				type: "SERVICE",
			},
		]);
		delete state.kvFormItem["line-0"].groupItem.form.value.meta;

		costing.calculateTotalPrice();

		expectPricing(state, {
			subTotal: 100,
			taxxable: 0,
			taxValue: 0,
			grandTotal: 100,
		});
	});

	test("taxes products and checked services but excludes unchecked services", () => {
		const { costing, state } = createCosting([
			{
				totalPrice: 3000,
				type: "DOOR",
			},
			{
				totalPrice: 2000,
				type: "SERVICE",
				taxable: true,
			},
			{
				totalPrice: 7000,
				type: "SERVICE",
				taxable: false,
			},
		]);

		costing.calculateTotalPrice();

		expectPricing(state, {
			subTotal: 12000,
			taxxable: 5000,
			taxValue: 350,
			grandTotal: 12350,
		});
	});

	test("clamps the taxable subtotal to zero when discount exceeds it", () => {
		const { costing, state } = createCosting(
			[
				{
					totalPrice: 1000,
					type: "SERVICE",
					taxable: true,
				},
				{
					totalPrice: 7000,
					type: "SERVICE",
					taxable: false,
				},
			],
			{
				discount: 2000,
			},
		);

		costing.calculateTotalPrice();

		expectPricing(state, {
			subTotal: 8000,
			taxxable: 0,
			taxValue: 0,
			grandTotal: 6000,
		});
	});

	test("applies negative discounts consistently to subtotal and tax", () => {
		const { costing, state } = createCosting(
			[
				{
					totalPrice: 1000,
					type: "SERVICE",
					taxable: true,
				},
			],
			{
				discount: -100,
				taxPercentage: 10,
			},
		);

		costing.calculateTotalPrice();

		expectPricing(state, {
			subTotal: 1000,
			taxxable: 1100,
			taxValue: 110,
			grandTotal: 1210,
		});
	});

	test("keeps delivery and eligible extra costs in the taxable base", () => {
		const { costing, state } = createCosting(
			[
				{
					totalPrice: 7000,
					type: "SERVICE",
					taxable: false,
				},
			],
			{
				delivery: 100,
				extraCost: 50,
				taxPercentage: 10,
			},
		);

		costing.calculateTotalPrice();

		expectPricing(state, {
			subTotal: 7000,
			taxxable: 150,
			taxValue: 15,
			grandTotal: 7165,
		});
	});

	test("subtracts percentage discounts and keeps the ccc total separate", () => {
		const { costing, state } = createCosting(
			[{ totalPrice: 100, type: "DOOR" }],
			{
				discountPercentage: 10,
				paymentMethod: "Credit Card",
				taxPercentage: 0,
			},
		);

		costing.calculateTotalPrice();

		expectPricing(state, {
			subTotal: 100,
			discountPct: 10,
			percentDiscountValue: 10,
			grandTotal: 90,
			ccc: 3.15,
			totalWithCcc: 93.15,
		});
	});

	test("composes labor, flat labor, and card charge in the final total", () => {
		const { costing, state } = createCosting(
			[{ totalPrice: 100, type: "DOOR" }],
			{
				paymentMethod: "Credit Card",
				taxPercentage: 0,
			},
		);
		state.metaData.salesLaborConfig.rate = 4;
		state.metaData.extraCosts = [
			{ type: "Labor", amount: 0 },
			{ type: "FlatLabor", amount: 15 },
		];
		state.kvFormItem["line-0"].groupItem.form.value.pricing = {
			totalPrice: 100,
			laborQty: 2,
		};

		costing.calculateTotalPrice();

		expectPricing(state, {
			subTotal: 100,
			taxxable: 100,
			grandTotal: 123,
			ccc: 4.31,
			totalWithCcc: 127.31,
		});
		expect(state.metaData.extraCosts[0].amount).toBe(8);
	});

	test("rounds subtotal additions through the shared money boundary", () => {
		const { costing, state } = createCosting([
			{ totalPrice: 0.1, type: "DOOR" },
			{ totalPrice: 0.2, type: "DOOR" },
		]);

		costing.calculateTotalPrice();

		expectPricing(state, {
			subTotal: 0.3,
			taxxable: 0.3,
		});
	});

	test("persists pricing even when the optional labor row is absent", () => {
		const { costing, state } = createCosting([
			{
				totalPrice: 125,
				type: "DOOR",
			},
		]);
		state.metaData.extraCosts = [];

		costing.calculateTotalPrice();

		expectPricing(state, {
			subTotal: 125,
			taxxable: 125,
			taxValue: 8.75,
			grandTotal: 133.75,
		});
	});

	test("treats a custom grouped price as the final unit price", () => {
		const { costing } = createCosting([]);
		const groupItem = {
			pricing: {
				components: { salesPrice: 20 },
				flatRate: 5,
				total: { basePrice: 0, salesPrice: 0 },
			},
		};
		const formData = {
			selected: true,
			qty: { total: 3 },
			pricing: {
				customPrice: 10,
				addon: 5,
				itemPrice: { salesPrice: 30 },
			},
		};

		const pricing = costing.getEstimatePricing(groupItem, formData);

		expect(pricing.unitPrice).toBe(10);
		expect(pricing.totalPrice).toBe(30);
	});
});
