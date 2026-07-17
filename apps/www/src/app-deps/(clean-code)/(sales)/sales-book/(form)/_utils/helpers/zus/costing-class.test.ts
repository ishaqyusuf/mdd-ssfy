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
	extraCost?: number;
	taxPercentage?: number;
}

function createCosting(lines: PricingLine[], options: CostingOptions = {}) {
	const extraCosts = [{ type: "Labor", amount: 0 }];
	if (options.discount)
		extraCosts.push({ type: "Discount", amount: options.discount });
	if (options.extraCost)
		extraCosts.push({ type: "Other", amount: options.extraCost });

	const state = {
		metaData: {
			pricing: {
				delivery: options.delivery || 0,
			},
			extraCosts,
			paymentMethod: null,
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
});
