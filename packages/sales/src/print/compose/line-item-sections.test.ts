import { describe, expect, it } from "bun:test";
import type { PrintSalesData } from "../query";
import type { PrintModeConfig } from "../types";
import { composeLineItemSections } from "./line-item-sections";

describe("composeLineItemSections", () => {
	it("keeps multiple generic line items even when legacy uid metadata collides", () => {
		const sale = {
			items: [
				{
					id: 101,
					description: "First line item",
					swing: "LH",
					qty: 2,
					rate: 100,
					total: 200,
					shelfItems: [],
					housePackageTool: null,
					meta: { uid: 0, lineIndex: 3 },
				},
				{
					id: 102,
					description: "Second line item",
					swing: "RH",
					qty: 1,
					rate: 50,
					total: 50,
					shelfItems: [],
					housePackageTool: null,
					meta: { uid: 0, lineIndex: 4 },
				},
			],
			deliveries: [],
		} as unknown as PrintSalesData;

		const sections = composeLineItemSections(
			sale,
			{ showPackingCol: false, showPrices: true } as PrintModeConfig,
			null,
		);

		expect(sections).toHaveLength(1);
		expect(sections[0]?.title).toBe("");
		expect(sections[0]?.rows).toHaveLength(2);
		expect(sections[0]?.rows[0]?.cells[1]?.value).toBe("FIRST LINE ITEM");
		expect(sections[0]?.rows[0]?.cells[2]?.value).toBe("LH");
		expect(sections[0]?.rows[1]?.cells[1]?.value).toBe("SECOND LINE ITEM");
		expect(sections[0]?.rows[1]?.cells[2]?.value).toBe("RH");
	});

	it("excludes metadata-backed moulding and service rows from generic line items", () => {
		const sale = {
			items: [
				{
					id: 201,
					description: "Generic line item",
					swing: "LH",
					qty: 1,
					rate: 20,
					total: 20,
					shelfItems: [],
					housePackageTool: null,
					formSteps: [],
					meta: { meta: { lineIndex: 3 } },
				},
				{
					id: 202,
					description: "Moulding line",
					swing: "",
					qty: 2,
					rate: 75,
					total: 150,
					shelfItems: [],
					housePackageTool: null,
					formSteps: [
						{
							step: { title: "Item Type" },
							value: "Moulding",
						},
					],
					meta: {
						meta: {
							lineIndex: 1,
							mouldingRows: [{ uid: "m-1", qty: 2, salesPrice: 70 }],
						},
					},
				},
				{
					id: 203,
					description: "Service line",
					swing: "",
					qty: 1,
					rate: 80,
					total: 80,
					shelfItems: [],
					housePackageTool: null,
					formSteps: [
						{
							step: { title: "Item Type" },
							value: "Services",
						},
					],
					meta: {
						meta: {
							lineIndex: 2,
							serviceRows: [{ uid: "svc-1", qty: 1, unitPrice: 80 }],
						},
					},
				},
			],
			deliveries: [],
		} as unknown as PrintSalesData;

		const sections = composeLineItemSections(
			sale,
			{ showPackingCol: false, showPrices: true } as PrintModeConfig,
			null,
		);

		expect(sections).toHaveLength(1);
		expect(sections[0]?.rows).toHaveLength(1);
		expect(sections[0]?.rows[0]?.cells[1]?.value).toBe("GENERIC LINE ITEM");
	});
});
