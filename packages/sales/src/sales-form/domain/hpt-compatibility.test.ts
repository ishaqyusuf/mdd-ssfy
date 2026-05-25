import { describe, expect, it } from "bun:test";
import {
	hydrateHptDoorRowFromLegacy,
	normalizeHptDoorRowForLegacy,
	normalizeHptLineForLegacy,
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

	it("treats custom price as a unit override before addon", () => {
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
		expect(row.unitPrice).toBe(115);
		expect(row.lineTotal).toBe(230);
		expect(row.meta.overridePrice).toBe(90);
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
});
