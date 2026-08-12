import { describe, expect, it } from "bun:test";

import {
	applySharedDoorSurcharge,
	clearUnpricedDoorRowQty,
	deriveDoorSizeRows,
	getDoorSupplierMeta,
	getDoorRowProfilePriceDrift,
	isDoorRowPriceMissing,
	normalizeStoredDoorRows,
	repairDoorRowProfilePriceDrift,
	resolveWorkflowDoorSizePricing,
} from "./door-utils";
import { getSelectedDoorComponentsForLine } from "../../domain/selectors";

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

	it("reads missing-price state from JSON row metadata", () => {
		const row = clearUnpricedDoorRowQty({
			dimension: "2-8 x 7-0",
			lhQty: 1,
			rhQty: 1,
			totalQty: 2,
			unitPrice: 50,
			lineTotal: 100,
			meta: JSON.stringify({
				baseUnitPrice: 0,
				priceMissing: true,
			}),
		} as any);

		expect(isDoorRowPriceMissing(row)).toBe(true);
		expect(row.totalQty).toBe(0);
		expect(row.meta?.baseUnitPrice).toBe(0);
		expect(Object.keys(row.meta || {})).not.toContain("0");
	});

	it("reads supplier metadata from JSON step metadata", () => {
		const supplier = getDoorSupplierMeta({
			meta: JSON.stringify({
				formStepMeta: {
					supplierUid: "supplier-1",
					supplierName: "Primary Supplier",
				},
			}),
		} as any);

		expect(supplier).toEqual({
			supplierUid: "supplier-1",
			supplierName: "Primary Supplier",
		});
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

	it("detects and repairs stored HPT profile-price drift from base price", () => {
		const row = {
			dimension: "3-0 x 6-8",
			totalQty: 1,
			unitPrice: 6_000,
			lineTotal: 6_000,
			jambSizePrice: 5_500,
			meta: {
				baseUnitPrice: 4_500,
				doorSalesUnitPrice: 5_500,
				sharedDoorSurcharge: 500,
			},
		};

		expect(getDoorRowProfilePriceDrift(row, 1)).toEqual({
			actualDoorSalesUnitPrice: 5_500,
			expectedDoorSalesUnitPrice: 4_500,
			delta: 1_000,
		});

		const repaired = repairDoorRowProfilePriceDrift(row, {
			profileCoefficient: 1,
			sharedDoorSurcharge: 500,
		});

		expect(repaired?.jambSizePrice).toBe(4_500);
		expect(repaired?.meta?.doorSalesUnitPrice).toBe(4_500);
		expect(repaired?.unitPrice).toBe(5_000);
		expect(repaired?.lineTotal).toBe(5_000);
		expect(getDoorRowProfilePriceDrift(repaired, 1)).toBeNull();
	});

	it("does not report drift without a positive base price", () => {
		expect(
			getDoorRowProfilePriceDrift(
				{
					unitPrice: 5_500,
					meta: { baseUnitPrice: 0, doorSalesUnitPrice: 5_000 },
				},
				1,
			),
		).toBeNull();
	});

	it("prices a newly added HPT size from the current door component after edit reopen", () => {
		const line = {
			uid: "line-edit",
			formSteps: [
				{
					step: { uid: "height-step", title: "Height" },
					value: "7-0",
					prodUid: "height-70",
				},
				{
					step: { uid: "door-step", title: "Door" },
					meta: {
						selectedComponents: [
							{
								id: 45,
								uid: "door-edit",
								title: "Saved Door",
								pricing: null,
							},
						],
					},
				},
			],
		};
		const [component] = getSelectedDoorComponentsForLine(line, {
			availableComponents: [
				{
					id: 45,
					uid: "door-edit",
					title: "Current Door",
					pricing: { "2-8 x 7-0": { price: 120 } },
				},
			],
		});

		const rows = deriveDoorSizeRows({
			line: line as Parameters<typeof deriveDoorSizeRows>[0]["line"],
			existingRows: [],
			component: component as Parameters<
				typeof deriveDoorSizeRows
			>[0]["component"],
		});

		expect(rows).toHaveLength(1);
		expect(rows[0]?.dimension).toBe("2-8 x 7-0");
		expect(rows[0]?.unitPrice).toBe(120);
		expect(rows[0]?.meta?.priceMissing).toBe(false);
	});

	it("uses the same resolved estimate for an Add Size description and its new row", () => {
		const pricing = resolveWorkflowDoorSizePricing({
			component: {
				id: 978,
				pricing: { "3-0 x 6-8": { price: 92.56 } },
			},
			size: "3-0 x 6-8",
			salesMultiplier: 1 / 0.7,
			profileCoefficient: 0.7,
			sharedDoorSurcharge: 31.94,
		});

		expect(pricing.hasPrice).toBe(true);
		expect(pricing.basePrice).toBe(92.56);
		expect(pricing.doorSalesUnitPrice).toBe(132.23);
		expect(pricing.unitPrice).toBe(164.17);
	});

	it("marks an unconfigured Add Size option as unavailable", () => {
		const pricing = resolveWorkflowDoorSizePricing({
			component: {
				id: 978,
				pricing: { "3-0 x 6-8": { price: 92.56 } },
			},
			size: "2-0 x 6-8",
			sharedDoorSurcharge: 31.94,
		});

		expect(pricing).toEqual({
			hasPrice: false,
			basePrice: 0,
			doorSalesUnitPrice: 0,
			unitPrice: 0,
		});
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
				title: "Door A",
				pricing: {
					"2-8 x 7-0": { price: 0 },
				},
			},
		});

		expect(rows).toHaveLength(1);
		expect(rows[0]?.meta?.priceMissing).toBe(false);
		expect(rows[0]?.meta?.baseUnitPrice).toBe(0);
		expect(rows[0]?.meta?.componentUid).toBe("door-a");
		expect(rows[0]?.meta?.componentTitle).toBe("Door A");
	});

	it("preserves existing JSON component metadata during door-size derivation", () => {
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
					totalQty: 1,
					unitPrice: 140,
					lineTotal: 140,
					meta: JSON.stringify({
						baseUnitPrice: 99,
						priceMissing: false,
						componentUid: "stored-door",
						componentTitle: "Stored Door",
					}),
				} as any,
			],
			component: {
				id: 1,
				uid: "door-a",
				title: "Door A",
				pricing: {
					"2-8 x 7-0": { price: 120 },
				},
			},
		});

		expect(rows).toHaveLength(1);
		expect(rows[0]?.meta?.baseUnitPrice).toBe(99);
		expect(rows[0]?.meta?.componentUid).toBe("stored-door");
		expect(rows[0]?.meta?.componentTitle).toBe("Stored Door");
	});

	it("adds component metadata to fallback door-size rows", () => {
		const rows = deriveDoorSizeRows({
			line: {
				uid: "line-1",
				formSteps: [],
			} as any,
			existingRows: [],
			component: {
				id: 2,
				uid: "door-b",
				title: "Door B",
				basePrice: 80,
				salesPrice: 120,
				pricing: {},
			},
		});

		expect(rows).toHaveLength(1);
		expect(rows[0]?.stepProductId).toBe(2);
		expect(rows[0]?.meta?.componentUid).toBe("door-b");
		expect(rows[0]?.meta?.componentTitle).toBe("Door B");
	});

	it("normalizes stored door rows from JSON metadata", () => {
		const rows = normalizeStoredDoorRows([
			{
				dimension: "2-8 x 7-0",
				stepProductId: 1,
				unitPrice: 12.345,
				lineTotal: 24.69,
				meta: JSON.stringify({
					baseUnitPrice: 10.235,
					doorSalesUnitPrice: 12.555,
					sharedDoorSurcharge: 1.2,
					priceMissing: false,
				}),
			} as any,
		]);

		expect(rows[0]?.meta).toEqual({
			baseUnitPrice: 10.24,
			doorSalesUnitPrice: 12.56,
			sharedDoorSurcharge: 1.2,
			priceMissing: false,
		});
	});
});
