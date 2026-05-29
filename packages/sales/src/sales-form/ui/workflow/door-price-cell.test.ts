// @ts-expect-error packages/sales typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";

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

	it("back-solves internal price from the displayed dealer price when base price is zero", () => {
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

		expect(breakdown).toMatchObject({
			internalUnitPrice: 149,
			dealerUnitPrice: 178.8,
			marginAmount: 29.8,
		});
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
});
