import { describe, expect, it } from "bun:test";

import {
	applySharedDoorSurcharge,
	clearUnpricedDoorRowQty,
	deriveDoorSizeRows,
	isDoorRowPriceMissing,
} from "./door-utils";

describe("workflow door price availability", () => {
	it("clears selectable quantities for missing-price door rows", () => {
		const row = clearUnpricedDoorRowQty({
			dimension: "2-8 x 7-0",
			lhQty: 1,
			rhQty: 2,
			totalQty: 3,
			unitPrice: 50,
			lineTotal: 150,
			meta: {
				baseUnitPrice: 0,
				priceMissing: true,
			},
		});

		expect(isDoorRowPriceMissing(row)).toBe(true);
		expect(row.lhQty).toBe(0);
		expect(row.rhQty).toBe(0);
		expect(row.totalQty).toBe(0);
		expect(row.lineTotal).toBe(0);
		expect(row.unitPrice).toBe(50);
	});

	it("does not clear a configured zero-dollar price row", () => {
		const row = {
			dimension: "2-8 x 7-0",
			totalQty: 2,
			unitPrice: 0,
			lineTotal: 0,
			meta: {
				baseUnitPrice: 0,
				priceMissing: false,
			},
		};

		expect(isDoorRowPriceMissing(row)).toBe(false);
		expect(clearUnpricedDoorRowQty(row).totalQty).toBe(2);
	});

	it("preserves a positive selected unit price when base cost is zero", () => {
		const rows = applySharedDoorSurcharge(
			[
				{
					dimension: "1-6 x 6-8",
					lhQty: 1,
					totalQty: 1,
					unitPrice: 52.8,
					lineTotal: 52.8,
					meta: {
						baseUnitPrice: 0,
						priceMissing: false,
					},
				},
			],
			0,
		);

		expect(rows[0]?.unitPrice).toBe(52.8);
		expect(rows[0]?.lineTotal).toBe(52.8);
		expect(rows[0]?.meta?.baseUnitPrice).toBe(0);
	});

	it("clears persisted missing supplier-price rows during door-size derivation", () => {
		const rows = deriveDoorSizeRows({
			line: {
				uid: "line-1",
				formSteps: [
					{
						step: { uid: "height-step", title: "Height" },
						value: "7-0",
						prodUid: "height-70",
					},
				],
			} as any,
			existingRows: [
				{
					dimension: "2-8 x 7-0",
					stepProductId: 1,
					lhQty: 1,
					rhQty: 1,
					totalQty: 2,
					unitPrice: 0,
					lineTotal: 0,
					meta: {
						baseUnitPrice: 0,
						priceMissing: true,
					},
				},
			],
			component: {
				id: 1,
				uid: "door-a",
				pricing: {
					"2-8 x 7-0": { price: 120 },
				},
				supplierVariants: [],
			},
			supplierUid: "SUP-1",
		});

		expect(rows).toHaveLength(1);
		expect(rows[0]?.meta?.priceMissing).toBe(true);
		expect(rows[0]?.meta?.baseUnitPrice).toBe(0);
		expect(rows[0]?.lhQty).toBe(0);
		expect(rows[0]?.rhQty).toBe(0);
		expect(rows[0]?.totalQty).toBe(0);
	});

	it("treats explicit zero-dollar door-size pricing as configured", () => {
		const rows = deriveDoorSizeRows({
			line: {
				uid: "line-1",
				formSteps: [
					{
						step: { uid: "height-step", title: "Height" },
						value: "7-0",
						prodUid: "height-70",
					},
				],
			} as any,
			existingRows: [],
			component: {
				id: 1,
				uid: "door-a",
				pricing: {
					"2-8 x 7-0": { price: 0 },
				},
			},
		});

		expect(rows).toHaveLength(1);
		expect(rows[0]?.meta?.priceMissing).toBe(false);
		expect(rows[0]?.meta?.baseUnitPrice).toBe(0);
	});
});
