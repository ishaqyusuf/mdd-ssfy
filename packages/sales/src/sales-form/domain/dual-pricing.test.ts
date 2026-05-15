// @ts-expect-error packages/sales typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import { calculateDualSalesFormPricing } from "./dual-pricing";

describe("dual sales form pricing", () => {
	it("keeps internal and dealer totals separate", () => {
		const result = calculateDualSalesFormPricing({
			taxRate: 10,
			internalProfile: {
				id: 1,
				coefficient: 1,
			},
			dealerProfile: {
				id: 2,
				coefficient: 1.5,
			},
			lineItems: [
				{
					uid: "line-1",
					title: "Door",
					qty: 2,
					unitPrice: 100,
					taxxable: true,
				},
			],
		});

		expect(result.internalProfileId).toBe(1);
		expect(result.dealerProfileId).toBe(2);
		expect(result.lines[0]).toMatchObject({
			internalUnitPrice: 100,
			internalLineTotal: 200,
			dealerUnitPrice: 150,
			dealerLineTotal: 300,
		});
		expect(result.internalPricing.grandTotal).toBe(220);
		expect(result.dealerPricing.grandTotal).toBe(330);
	});

	it("falls back to coefficient 1 for missing profiles", () => {
		const result = calculateDualSalesFormPricing({
			lineItems: [
				{
					uid: "line-1",
					qty: 1,
					unitPrice: 42,
				},
			],
		});

		expect(result.lines[0]?.internalLineTotal).toBe(42);
		expect(result.lines[0]?.dealerLineTotal).toBe(42);
	});
});
