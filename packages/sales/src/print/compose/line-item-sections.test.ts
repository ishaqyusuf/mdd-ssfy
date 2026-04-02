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
});
