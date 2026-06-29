// @ts-expect-error packages/sales typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";

import { resolveCostPriceBreakdown } from "./cost-price-breakdown-hover";
import { resolveDoorPriceBreakdown } from "./door-price-cell";

describe("door price breakdown", () => {
	it("calculates internal price, dealer price, and margin from base price", () => {
		const breakdown = resolveDoorPriceBreakdown(
			{
				unitPrice: 178.8,
				meta: {
					baseUnitPrice: 100,
					priceMissing: false,
				},
			},
			{
				enabled: true,
				internalProfileCoefficient: 0.67,
				dealerSalesPercentage: 20,
			},
		);

		expect(breakdown).toMatchObject({
			internalUnitPrice: 149,
			dealerUnitPrice: 178.8,
			marginAmount: 29.8,
		});
		expect(breakdown?.marginPercent).toBeCloseTo(16.67, 2);
	});

	it("does not return a breakdown for missing prices", () => {
		const breakdown = resolveDoorPriceBreakdown(
			{
				unitPrice: 0,
				meta: {
					baseUnitPrice: 0,
					priceMissing: true,
				},
			},
			{
				enabled: true,
				internalProfileCoefficient: 0.67,
				dealerSalesPercentage: 20,
			},
		);

		expect(breakdown).toBeNull();
	});

	it("does not return a breakdown when the office cost is unavailable", () => {
		const breakdown = resolveDoorPriceBreakdown(
			{
				unitPrice: 178.8,
				jambSizePrice: 0,
				meta: {
					baseUnitPrice: 0,
					doorSalesUnitPrice: 0,
					priceMissing: false,
				},
			},
			{
				enabled: true,
				internalProfileCoefficient: 0.67,
				dealerSalesPercentage: 20,
				displayUnitPrice: 178.8,
			},
		);

		expect(breakdown).toBeNull();
	});

	it("does not return a breakdown outside dealer pricing context", () => {
		const breakdown = resolveDoorPriceBreakdown(
			{
				unitPrice: 149,
				meta: {
					baseUnitPrice: 100,
					priceMissing: false,
				},
			},
			{
				enabled: false,
				internalProfileCoefficient: 0.67,
				dealerSalesPercentage: 20,
			},
		);

		expect(breakdown).toBeNull();
	});

	it("resolves the office cost to dealer profile and customer profile sales chain", () => {
		const breakdown = resolveCostPriceBreakdown(
			{
				costPrice: 3.75,
			},
			{
				enabled: true,
				internalProfileCoefficient: 0.65,
				dealerSalesPercentage: 20,
				internalProfileLabel: "Tier 1 65%",
				dealerProfileLabel: "Tier 1 Markup",
			},
		);

		expect(breakdown).toMatchObject({
			costPrice: 3.75,
			internalProfileCoefficient: 0.65,
			internalProfileMultiplier: 1.54,
			dealerSalesPercentage: 20,
			dealerProfileSalesPrice: 5.78,
			customerSalesPrice: 6.94,
			displayPrice: 6.94,
			hasDealerProfileOverride: false,
			hasCustomerSalesOverride: false,
		});
	});

	it("uses rounded unit dealer sales before multiplying line totals by quantity", () => {
		const breakdown = resolveCostPriceBreakdown(
			{
				costPrice: 7.5,
				unitCostPrice: 3.75,
				quantity: 2,
				displayPrice: 13.88,
			},
			{
				enabled: true,
				internalProfileCoefficient: 0.65,
				dealerSalesPercentage: 20,
			},
		);

		expect(breakdown).toMatchObject({
			costPrice: 7.5,
			dealerProfileSalesPrice: 11.56,
			customerSalesPrice: 13.88,
			displayPrice: 13.88,
			hasDealerProfileOverride: false,
			hasCustomerSalesOverride: false,
			hasDisplayOverride: false,
		});
	});
});
