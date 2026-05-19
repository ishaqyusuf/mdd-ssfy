// @ts-expect-error packages/sales typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import { resolveDealerPrintPricingSurface } from "./dealer-pricing-surface";

describe("dealer print pricing surface", () => {
	it("uses customer-facing dealer pricing by default for dealer-owned sales", () => {
		const sale = resolveDealerPrintPricingSurface({
			dealerAuthId: 1,
			subTotal: 100,
			tax: 10,
			taxPercentage: 10,
			grandTotal: 110,
			amountDue: 110,
			meta: {
				dealerPricing: {
					summary: {
						subTotal: 250,
						taxTotal: 25,
						taxRate: 10,
						grandTotal: 275,
					},
				},
			},
			items: [
				{
					rate: 50,
					total: 100,
					meta: {
						dealerUnitPrice: 125,
						dealerLineTotal: 250,
					},
				},
			],
		});

		expect(sale.subTotal).toBe(250);
		expect(sale.tax).toBe(25);
		expect(sale.grandTotal).toBe(275);
		expect(sale.amountDue).toBe(275);
		expect(sale.items?.[0]?.rate).toBe(125);
		expect(sale.items?.[0]?.total).toBe(250);
	});

	it("keeps internal pricing when explicitly requested", () => {
		const input = {
			dealerAuthId: 1,
			subTotal: 100,
			tax: 10,
			taxPercentage: 10,
			grandTotal: 110,
			amountDue: 110,
			meta: {
				dealerPricing: {
					summary: {
						subTotal: 250,
						taxTotal: 25,
						taxRate: 10,
						grandTotal: 275,
					},
				},
			},
			items: [
				{
					rate: 50,
					total: 100,
					meta: {
						dealerUnitPrice: 125,
						dealerLineTotal: 250,
					},
				},
			],
		};

		const sale = resolveDealerPrintPricingSurface(input, "internal");

		expect(sale).toBe(input);
		expect(sale.grandTotal).toBe(110);
		expect(sale.items?.[0]?.rate).toBe(50);
	});
});
