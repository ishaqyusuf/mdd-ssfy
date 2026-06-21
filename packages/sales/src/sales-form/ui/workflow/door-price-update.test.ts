// @ts-expect-error packages/sales typecheck does not include Bun test types.
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
			doorSalesUnitPrice: 178.8,
			priceMissing: false,
		});
		expect(row.unitPrice).toBe(188.8);
		expect(row.lineTotal).toBe(377.6);
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
