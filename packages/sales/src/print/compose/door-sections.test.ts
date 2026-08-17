import { describe, expect, it } from "bun:test";
import type { PrintSalesData } from "../query";
import type { PrintModeConfig } from "../types";
import { composeDoorSections } from "./door-sections";

const config = {
	showPackingCol: false,
	showPrices: true,
} as PrintModeConfig;

function formStepGeneration(offset: number, updatedAt: string) {
	return [
		[1, "Item Type", "Interior pre-hung"],
		[2, "Door Configuration", "PH - Single"],
		[13, "Height", "6-8"],
		[31, "Bore", "Single Bore"],
		[41, "Door Type", "HC Molded"],
		[51, "Door", "Carrara"],
		[61, "Jamb Size", "4-5/8"],
		[115, "Hinge Finish", "Satin Nickel"],
		[137, "Cutdown Height", "No Cutdown"],
		[126, "Casing Y/N", "No Casing"],
		[141, "Casing", null],
		[212, "House Package Tool", null],
	].map(([stepId, title, value], index) => ({
		id: offset + index,
		stepId,
		value,
		updatedAt: new Date(updatedAt),
		step: { id: stepId, title },
		component: value ? { name: value, meta: null } : null,
	}));
}

describe("composeDoorSections", () => {
	it("prints only the current HPT child generation when prior saves left active rows", () => {
		const sale = {
			items: [
				{
					id: 169514,
					qty: 14,
					rate: 109.99,
					total: 1539.86,
					description: "Interior pre-hung",
					dykeDescription: "Interior pre-hung",
					multiDyke: false,
					multiDykeUid: null,
					meta: { doorType: "Interior pre-hung" },
					formSteps: [
						...formStepGeneration(100, "2026-08-17T21:26:12.152Z"),
						...formStepGeneration(200, "2026-08-17T21:39:28.570Z"),
						...formStepGeneration(300, "2026-08-17T21:40:32.714Z"),
					],
					housePackageTool: {
						doorType: "Interior pre-hung",
						doors: [
							{
								id: 1,
								dimension: "2-6 x 6-8",
								lhQty: 5,
								rhQty: 5,
								totalQty: 10,
								unitPrice: 109.99,
								lineTotal: 1099.9,
								updatedAt: new Date("2026-08-17T21:39:28.603Z"),
								stepProduct: { name: "Carrara" },
							},
							{
								id: 2,
								dimension: "2-8 x 6-8",
								lhQty: 2,
								rhQty: 2,
								totalQty: 4,
								unitPrice: 109.99,
								lineTotal: 439.96,
								updatedAt: new Date("2026-08-17T21:39:28.620Z"),
								stepProduct: { name: "Carrara" },
							},
							{
								id: 3,
								dimension: "2-6 x 6-8",
								lhQty: 4,
								rhQty: 4,
								totalQty: 8,
								unitPrice: 109.99,
								lineTotal: 879.92,
								updatedAt: new Date("2026-08-17T21:40:32.752Z"),
								stepProduct: { name: "Carrara" },
							},
							{
								id: 4,
								dimension: "2-8 x 6-8",
								lhQty: 3,
								rhQty: 3,
								totalQty: 6,
								unitPrice: 109.99,
								lineTotal: 659.94,
								updatedAt: new Date("2026-08-17T21:40:32.773Z"),
								stepProduct: { name: "Carrara" },
							},
						],
					},
				},
			],
		} as unknown as PrintSalesData;

		const [section] = composeDoorSections(sale, config, null);

		expect(section?.details.map(({ label }) => label)).toEqual([
			"Door Configuration",
			"Height",
			"Bore",
			"Door Type",
			"Jamb Size",
			"Hinge Finish",
			"Cutdown Height",
			"Casing Y/N",
			"Casing",
			"House Package Tool",
		]);
		expect(section?.rows).toHaveLength(2);
		expect(section?.rows.map((row) => row.cells[2]?.value)).toEqual([
			'30" x 80"',
			'32" x 80"',
		]);
		expect(section?.rows.map((row) => row.cells.at(-1)?.value)).toEqual([
			"$879.92",
			"$659.94",
		]);
	});
});
