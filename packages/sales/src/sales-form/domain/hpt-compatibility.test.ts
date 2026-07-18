import { describe, expect, it } from "bun:test";
import {
	hydrateHptDoorRowFromLegacy,
	hydrateHptLineFromLegacy,
	normalizeHptDoorRowForLegacy,
	normalizeHptLineForLegacy,
	resolveHptDoorUnitPriceBreakdown,
} from "./hpt-compatibility";

describe("HPT legacy compatibility", () => {
	it("maps door-only price and surcharge into legacy fields", () => {
		const row: any = normalizeHptDoorRowForLegacy(
			{
				dimension: "2-8 x 6-8",
				lhQty: 1,
				rhQty: 1,
				totalQty: 2,
				unitPrice: 111,
				meta: {
					baseUnitPrice: 111,
				},
			},
			{
				sharedDoorSurcharge: 20,
			},
		);

		expect(row.jambSizePrice).toBe(111);
		expect(row.doorPrice).toBe(0);
		expect(row.unitPrice).toBe(131);
		expect(row.lineTotal).toBe(262);
		expect(row.meta.doorSalesUnitPrice).toBe(111);
		expect(row.meta.sharedDoorSurcharge).toBe(20);
	});

	it("keeps addon in doorPrice instead of treating it as the door price", () => {
		const row: any = normalizeHptDoorRowForLegacy(
			{
				totalQty: 3,
				addon: 7,
				meta: {
					doorSalesUnitPrice: 111,
				},
			},
			{
				sharedDoorSurcharge: 20,
			},
		);

		expect(row.jambSizePrice).toBe(111);
		expect(row.doorPrice).toBe(7);
		expect(row.unitPrice).toBe(138);
		expect(row.lineTotal).toBe(414);
	});

	it("treats custom price as the final unit price", () => {
		const row: any = normalizeHptDoorRowForLegacy(
			{
				totalQty: 2,
				customPrice: 90,
				addon: 5,
				meta: {
					doorSalesUnitPrice: 111,
				},
			},
			{
				sharedDoorSurcharge: 20,
			},
		);

		expect(row.jambSizePrice).toBe(111);
		expect(row.unitPrice).toBe(90);
		expect(row.lineTotal).toBe(180);
		expect(row.meta.overridePrice).toBe(90);
		expect(row.meta.calculatedFinalUnitPrice).toBe(136);
	});

	it("resolves persisted override metadata as an active custom final unit", () => {
		const row: any = normalizeHptDoorRowForLegacy(
			{
				totalQty: 2,
				unitPrice: 136,
				addon: 5,
				meta: {
					doorSalesUnitPrice: 111,
					overridePrice: 90,
				},
			},
			{
				sharedDoorSurcharge: 20,
			},
		);
		const breakdown = resolveHptDoorUnitPriceBreakdown(row, {
			sharedDoorSurcharge: 20,
		});

		expect(row.customPrice).toBe(90);
		expect(row.unitPrice).toBe(90);
		expect(row.lineTotal).toBe(180);
		expect(breakdown.hasCustomPrice).toBe(true);
		expect(breakdown.calculatedFinalUnitPrice).toBe(136);
	});

	it("resolves persisted override metadata from JSON row metadata", () => {
		const row: any = normalizeHptDoorRowForLegacy(
			{
				totalQty: 2,
				unitPrice: 136,
				addon: 5,
				meta: JSON.stringify({
					doorSalesUnitPrice: 111,
					overridePrice: 90,
				}),
			},
			{
				sharedDoorSurcharge: 20,
			},
		);

		expect(row.customPrice).toBe(90);
		expect(row.unitPrice).toBe(90);
		expect(row.lineTotal).toBe(180);
		expect(row.meta.overridePrice).toBe(90);
		expect(row.meta.calculatedFinalUnitPrice).toBe(136);
	});

	it("hydrates legacy rows from jambSizePrice and doorPrice", () => {
		const row: any = hydrateHptDoorRowFromLegacy(
			{
				jambSizePrice: 111,
				doorPrice: 8,
				totalQty: 1,
				unitPrice: 139,
				lineTotal: 139,
				meta: {},
			},
			{
				sharedDoorSurcharge: 20,
			},
		);

		expect(row.meta.doorSalesUnitPrice).toBe(111);
		expect(row.addon).toBe(8);
		expect(row.unitPrice).toBe(139);
		expect(row.lineTotal).toBe(139);
	});

	it("preserves a persisted final unit when current component prices have drifted", () => {
		const line: any = hydrateHptLineFromLegacy({
			formSteps: [
				{ step: { title: "Jamb Size" }, price: 33.49 },
				{ step: { title: "Hinge Finish" }, price: 8.55 },
			],
			housePackageTool: {
				doors: [
					{
						jambSizePrice: 197.38,
						doorPrice: 0,
						lhQty: 1,
						rhQty: 0,
						totalQty: 1,
						unitPrice: 233.7,
						lineTotal: 233.7,
						meta: {},
					},
				],
			},
		});

		expect(line.housePackageTool.doors[0].meta.doorSalesUnitPrice).toBe(191.66);
		expect(line.housePackageTool.doors[0].unitPrice).toBe(233.7);
		expect(line.unitPrice).toBe(233.7);
		expect(line.lineTotal).toBe(233.7);
	});

	it("reconciles a legacy door rounding cent to the persisted parent total", () => {
		const line: any = hydrateHptLineFromLegacy({
			lineTotal: 233.7,
			formSteps: [
				{ step: { title: "Jamb Size" }, price: 33.49 },
				{ step: { title: "Hinge Finish" }, price: 8.55 },
			],
			housePackageTool: {
				doors: [
					{
						jambSizePrice: 197.38,
						lhQty: 1,
						totalQty: 1,
						unitPrice: 233.695,
						lineTotal: 233.695,
						meta: {},
					},
				],
			},
		});

		expect(line.housePackageTool.doors[0].unitPrice).toBe(233.7);
		expect(line.housePackageTool.doors[0].lineTotal).toBe(233.7);
		expect(line.lineTotal).toBe(233.7);
	});

	it("hydrates legacy rows while preserving JSON metadata", () => {
		const row: any = hydrateHptDoorRowFromLegacy(
			{
				jambSizePrice: 111,
				doorPrice: 8,
				totalQty: 1,
				unitPrice: 139,
				lineTotal: 139,
				meta: JSON.stringify({
					componentUid: "door-json",
					priceMissing: false,
				}),
			},
			{
				sharedDoorSurcharge: 20,
			},
		);

		expect(row.meta.componentUid).toBe("door-json");
		expect(row.meta.doorSalesUnitPrice).toBe(111);
		expect(row.addon).toBe(8);
		expect(row.unitPrice).toBe(139);
	});

	it("lets durable legacy fields override stale new-form metadata on hydrate", () => {
		const row: any = hydrateHptDoorRowFromLegacy(
			{
				jambSizePrice: 111,
				doorPrice: 5,
				addon: 99,
				totalQty: 2,
				unitPrice: 136,
				lineTotal: 272,
				meta: {
					doorSalesUnitPrice: 999,
					addon: 88,
				},
			},
			{
				sharedDoorSurcharge: 20,
			},
		);

		expect(row.jambSizePrice).toBe(111);
		expect(row.doorPrice).toBe(5);
		expect(row.addon).toBe(5);
		expect(row.unitPrice).toBe(136);
		expect(row.lineTotal).toBe(272);
		expect(row.meta.doorSalesUnitPrice).toBe(111);
	});

	it("normalizes HPT parent totals and average rate", () => {
		const line: any = normalizeHptLineForLegacy({
			uid: "line-1",
			qty: 1,
			unitPrice: 0,
			lineTotal: 0,
			formSteps: [{ step: { title: "Specie" }, price: 20 }],
			housePackageTool: {
				id: null,
				doors: [
					{
						totalQty: 2,
						meta: {
							doorSalesUnitPrice: 111,
						},
					},
				],
			},
		});

		expect(line.qty).toBe(2);
		expect(line.unitPrice).toBe(131);
		expect(line.lineTotal).toBe(262);
		expect(line.housePackageTool.totalDoors).toBe(2);
		expect(line.housePackageTool.totalPrice).toBe(262);
	});

	it("normalizes HPT totals with JSON row and step metadata", () => {
		const line: any = normalizeHptLineForLegacy({
			uid: "line-1",
			qty: 1,
			unitPrice: 0,
			lineTotal: 0,
			formSteps: [
				{
					step: { title: "Specie" },
					price: 20,
					meta: JSON.stringify({ flatRate: 3 }),
				},
			],
			housePackageTool: {
				id: null,
				doors: [
					{
						totalQty: 2,
						meta: JSON.stringify({
							doorSalesUnitPrice: 111,
						}),
					},
				],
			},
		});

		expect(line.qty).toBe(2);
		expect(line.unitPrice).toBe(134);
		expect(line.lineTotal).toBe(268);
		expect(line.housePackageTool.doors[0].meta.flatRate).toBe(3);
		expect(line.housePackageTool.totalPrice).toBe(268);
	});
});
