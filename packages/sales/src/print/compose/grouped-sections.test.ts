import { describe, expect, it } from "bun:test";
import type { PrintSalesData } from "../query";
import type { PrintModeConfig } from "../types";
import { composeMouldingSections } from "./moulding-sections";
import { composeServiceSections } from "./service-sections";

const config = {
	showPackingCol: false,
	showPrices: true,
} as PrintModeConfig;

describe("grouped print sections", () => {
	it("renders metadata-backed moulding rows with selected component details", () => {
		const sale = {
			items: [
				{
					id: 10,
					description: "Fallback Casing",
					dykeDescription: "Trim Package",
					qty: 2,
					rate: 75,
					total: 150,
					meta: {
						meta: {
							lineIndex: 2,
							mouldingRows: [
								{
									uid: "m-1",
									title: "Casing",
									description: "Casing",
									qty: 2,
									salesPrice: 70,
								},
							],
						},
					},
					formSteps: [
						{
							step: { title: "Item Type" },
							value: "Moulding",
						},
						{
							step: { title: "Moulding" },
							meta: {
								selectedComponents: [
									{
										uid: "m-1",
										title: "Colonial Casing",
										img: "casing.png",
									},
								],
							},
						},
					],
					housePackageTool: null,
				},
			],
		} as unknown as PrintSalesData;

		const sections = composeMouldingSections(sale, config, null);

		expect(sections).toHaveLength(1);
		expect(sections[0]?.index).toBe(2);
		expect(sections[0]?.rows).toHaveLength(1);
		expect(sections[0]?.rows[0]?.cells[1]?.value).toBe("Colonial Casing");
		expect(sections[0]?.rows[0]?.cells[1]?.image).toBe("casing.png");
		expect(sections[0]?.rows[0]?.cells[2]?.value).toBe(2);
		expect(sections[0]?.rows[0]?.cells[3]?.value).toBe("$70.00");
		expect(sections[0]?.rows[0]?.cells[4]?.value).toBe("$140.00");
	});

	it("renders metadata-backed service rows and preserves legacy service items", () => {
		const sale = {
			items: [
				{
					id: 11,
					description: "Install | Delivery",
					dykeDescription: "Services",
					meta: {
						meta: {
							lineIndex: 3,
							serviceRows: [
								{
									uid: "svc-1",
									service: "Install",
									qty: 1,
									unitPrice: 80,
								},
								{
									uid: "svc-2",
									service: "Delivery",
									qty: 1,
									unitPrice: 50,
								},
							],
						},
					},
					formSteps: [
						{
							step: { title: "Item Type" },
							value: "Services",
						},
					],
					housePackageTool: null,
				},
				{
					id: 12,
					description: "Legacy Install",
					qty: 2,
					rate: 60,
					total: 120,
					meta: {
						lineIndex: 4,
						doorType: "Services",
					},
					formSteps: [],
					housePackageTool: {
						doorType: "Services",
					},
				},
			],
		} as unknown as PrintSalesData;

		const sections = composeServiceSections(sale, config, null);

		expect(sections).toHaveLength(2);
		expect(sections[0]?.rows).toHaveLength(2);
		expect(sections[0]?.rows[0]?.cells[1]?.value).toBe("Install");
		expect(sections[0]?.rows[1]?.cells[1]?.value).toBe("Delivery");
		expect(sections[1]?.rows).toHaveLength(1);
		expect(sections[1]?.rows[0]?.cells[1]?.value).toBe("Legacy Install");
	});
});
