import { describe, expect, it } from "bun:test";

import {
	patchDoorRowCustomPrice,
	updateDoorRowBasePrice,
} from "./door-price-update";

describe("door price updates", () => {
	it("recalculates sales price while preserving the existing surcharge", () => {
		const row = updateDoorRowBasePrice(
			{
				unitPrice: 159,
				lhQty: 1,
				rhQty: 1,
				totalQty: 2,
				lineTotal: 318,
				meta: {
					baseUnitPrice: 100,
					doorSalesUnitPrice: 149,
				},
			},
			120,
			0.67,
		);

		expect(row.meta).toMatchObject({
			baseUnitPrice: 120,
			doorSalesUnitPrice: 179.1,
			priceMissing: false,
		});
		expect(row.unitPrice).toBe(188.85);
		expect(row.lineTotal).toBe(377.7);
	});

	it("clears a stale custom override when the base price is edited", () => {
		const row = updateDoorRowBasePrice(
			{
				unitPrice: 18.5,
				lhQty: 24,
				rhQty: 16,
				totalQty: 40,
				lineTotal: 740,
				customPrice: 18.5,
				meta: {
					baseUnitPrice: 13.13,
					doorSalesUnitPrice: 17.51,
					sharedDoorSurcharge: 1,
					customPrice: 18.5,
					overridePrice: 18.5,
				},
			},
			13.14,
			0.75,
		);

		expect(row.customPrice).toBeNull();
		expect(row.meta).toMatchObject({
			baseUnitPrice: 13.14,
			doorSalesUnitPrice: 17.52,
			sharedDoorSurcharge: 1,
			customPrice: null,
			overridePrice: null,
		});
		expect(row.unitPrice).toBe(18.52);
		expect(row.lineTotal).toBe(740.8);
	});

	it("clears legacy custom-price metadata when returning to auto pricing", () => {
		const row = patchDoorRowCustomPrice(
			{
				unitPrice: 225,
				lhQty: 1,
				rhQty: 1,
				lineTotal: 450,
				customPrice: 225,
				meta: {
					doorSalesUnitPrice: 120,
					sharedDoorSurcharge: 20,
					calculatedFinalUnitPrice: 140,
					customPrice: 225,
					overridePrice: 225,
				},
			},
			null,
		);

		expect(row.customPrice).toBeNull();
		expect(row.meta?.customPrice).toBeNull();
		expect(row.meta?.overridePrice).toBeNull();
		expect(row.unitPrice).toBe(140);
		expect(row.lineTotal).toBe(280);
	});

	it("applies custom price as the immediate final HPT door unit", () => {
		const row = patchDoorRowCustomPrice(
			{
				unitPrice: 140,
				lhQty: 1,
				rhQty: 1,
				lineTotal: 280,
				meta: {
					doorSalesUnitPrice: 120,
					sharedDoorSurcharge: 20,
				},
			},
			225,
		);

		expect(row.customPrice).toBe(225);
		expect(row.meta?.customPrice).toBe(225);
		expect(row.meta?.overridePrice).toBe(225);
		expect(row.meta?.calculatedFinalUnitPrice).toBe(140);
		expect(row.meta?.finalUnitPrice).toBe(225);
		expect(row.unitPrice).toBe(225);
		expect(row.lineTotal).toBe(450);
	});
});
