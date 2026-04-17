import { describe, expect, it } from "bun:test";
import type { PrintSalesItem } from "../query";
import {
	getMetaRows,
	getSalesItemType,
	getSectionIndex,
	isMetadataBackedMouldingItem,
	isMetadataBackedServiceItem,
} from "./grouped-item-helpers";

function createItem(overrides: Partial<PrintSalesItem> = {}) {
	return {
		id: 1,
		meta: {
			uid: "line-1",
			meta: {
				lineIndex: 4,
				mouldingRows: [{ uid: "m-1", qty: 2 }],
			},
		},
		formSteps: [
			{
				step: { title: "Item Type" },
				value: "Moulding",
			},
		],
		housePackageTool: null,
		...overrides,
	} as unknown as PrintSalesItem;
}

describe("grouped-item-helpers", () => {
	it("reads new-form nested metadata and item type fallbacks", () => {
		const item = createItem();
		expect(getSalesItemType(item)).toBe("Moulding");
		expect(getSectionIndex(item, 99)).toBe(4);
		expect(getMetaRows(item, "mouldingRows")).toHaveLength(1);
		expect(isMetadataBackedMouldingItem(item)).toBe(true);
		expect(isMetadataBackedServiceItem(item)).toBe(false);
	});

	it("detects metadata-backed service rows", () => {
		const item = createItem({
			meta: {
				meta: {
					serviceRows: [{ uid: "svc-1", qty: 1, unitPrice: 20 }],
				},
			},
			formSteps: [
				{
					step: { title: "Item Type" },
					value: "Services",
				},
			],
		});
		expect(getSalesItemType(item)).toBe("Services");
		expect(isMetadataBackedServiceItem(item)).toBe(true);
		expect(isMetadataBackedMouldingItem(item)).toBe(false);
	});
});
