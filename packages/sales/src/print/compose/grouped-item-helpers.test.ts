import { describe, expect, it } from "bun:test";
import type { PrintSalesItem } from "../query";

import {
	getCurrentHousePackageDoors,
	getLatestFormSteps,
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

	it("treats grouped moulding rows as authoritative when HPT relations exist", () => {
		const item = createItem({
			housePackageTool: {
				doorType: "Moulding",
				stepProduct: { name: "Stale shared product" },
			} as PrintSalesItem["housePackageTool"],
		});

		expect(isMetadataBackedMouldingItem(item)).toBe(true);
	});

	it("prefers the new-form item sequence over a stale legacy line index", () => {
		const item = createItem({
			meta: {
				meta: {
					itemIndex: 0,
					lineIndex: 9,
				},
			},
		});

		expect(getSectionIndex(item, 99)).toBe(0);
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

describe("financial print door reconciliation", () => {
	it("rejects active door rows that do not reconcile to the persisted parent", () => {
		const item = {
			qty: 15,
			total: 1439.67,
			housePackageTool: {
				doors: [
					{ id: 1, totalQty: 9, lineTotal: 438.66 },
					{ id: 2, totalQty: 1, lineTotal: 77.43 },
					{ id: 3, totalQty: 1, lineTotal: 179.7 },
				],
			},
		} as never;

		expect(() =>
			getCurrentHousePackageDoors(item, { requireReconciliation: true }),
		).toThrow("do not reconcile");
	});

	it("returns exact active rows for a reconciled financial item", () => {
		const doors = [
			{ id: 1, totalQty: 4, lineTotal: 743.88 },
			{ id: 2, totalQty: 1, lineTotal: 125.01 },
			{ id: 3, totalQty: 1, lineTotal: 179.7 },
		];
		const item = {
			qty: 6,
			total: 1048.59,
			housePackageTool: { doors },
		} as never;

		expect(
			getCurrentHousePackageDoors(item, { requireReconciliation: true }),
		).toEqual(doors);
	});
});

describe("financial print form-step reconciliation", () => {
	it("rejects conflicting active revisions of the same logical step", () => {
		const item = {
			id: 170412,
			formSteps: [
				{
					id: 396499,
					stepId: 61,
					value: "5-1/2",
					componentId: 386,
					step: { id: 61, title: "Jamb Size" },
				},
				{
					id: 403255,
					stepId: 61,
					value: '5-1/4"',
					componentId: 384,
					step: { id: 61, title: "Jamb Size" },
				},
			],
		} as never;

		expect(() =>
			getLatestFormSteps(item, { requireSingleRevision: true }),
		).toThrow("form-step revisions do not reconcile");
	});
});
