// @ts-expect-error packages/sales typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import {
	buildDualSalesFormPricingSnapshot,
	calculateDualSalesFormPricing,
} from "./dual-pricing";

describe("dual sales form pricing", () => {
	it("keeps internal and dealer totals separate", () => {
		const result = calculateDualSalesFormPricing({
			taxRate: 10,
			internalProfile: {
				id: 1,
				coefficient: 1.5,
			},
			dealerProfile: {
				id: 2,
				salesPercentage: 20,
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
			internalUnitPrice: 150,
			internalLineTotal: 300,
			dealerUnitPrice: 180,
			dealerLineTotal: 360,
		});
		expect(result.internalPricing.grandTotal).toBe(330);
		expect(result.dealerPricing.grandTotal).toBe(396);
	});

	it("falls back to coefficient 1 and 0 percent for missing profiles", () => {
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

	it("builds an explicit reusable snapshot with office coefficient and dealer percentage", () => {
		const snapshot = buildDualSalesFormPricingSnapshot({
			createdAt: "2026-05-18T00:00:00.000Z",
			internalProfile: {
				id: 10,
				label: "Standard",
				coefficient: 1.5,
			},
			dealerProfile: {
				id: 20,
				label: "Retail",
				salesPercentage: 20,
			},
			lineItems: [
				{
					uid: "line-1",
					title: "Shelf",
					qty: 2,
					unitPrice: 25,
				},
			],
		});

		expect(snapshot.source).toBe("sales_form_dual_pricing");
		expect(snapshot.createdAt).toBe("2026-05-18T00:00:00.000Z");
		expect(snapshot.profiles.internal).toEqual({
			id: 10,
			label: "Standard",
			coefficient: 1.5,
		});
		expect(snapshot.profiles.dealer).toEqual({
			id: 20,
			label: "Retail",
			salesPercentage: 20,
		});
		expect(snapshot.internalPricing.grandTotal).toBe(75);
		expect(snapshot.dealerPricing.grandTotal).toBe(90);
	});
});
