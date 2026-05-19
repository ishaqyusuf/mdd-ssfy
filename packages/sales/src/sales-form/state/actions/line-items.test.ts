import { describe, expect, it } from "bun:test";
import { createInitialSalesFormState } from "../initial-state";
import {
	addSalesFormLineItem,
	removeSalesFormLineItem,
	updateSalesFormLineItem,
} from "./line-items";
import { setSalesFormTaxRate } from "./summary";
import type { SalesFormStateRecord } from "../types";

function createRecord(): SalesFormStateRecord {
	return {
		type: "quote",
		salesId: null,
		slug: "Q-1",
		version: "v1",
		updatedAt: "2026-05-18T00:00:00.000Z",
		form: {
			paymentMethod: null,
		},
		lineItems: [
			{
				id: null,
				uid: "line-1",
				title: "Line 1",
				description: "",
				qty: 2,
				unitPrice: 10,
				lineTotal: 20,
				meta: {},
				formSteps: [],
				shelfItems: [],
				housePackageTool: null,
			},
		],
		extraCosts: [],
		summary: {
			taxRate: 0,
			subTotal: 20,
			grandTotal: 20,
		},
	};
}

describe("sales form state line item actions", () => {
	it("updates line totals and marks state dirty", () => {
		const state = {
			...createInitialSalesFormState(),
			record: createRecord(),
		};

		const next = updateSalesFormLineItem(state, "line-1", {
			qty: 3,
			unitPrice: 15,
		});

		expect(next.dirty).toBe(true);
		expect(next.record?.lineItems[0]?.lineTotal).toBe(45);
		expect(next.record?.summary?.subTotal).toBe(45);
	});

	it("sets the new line active when adding a line", () => {
		const state = {
			...createInitialSalesFormState(),
			record: createRecord(),
		};

		const next = addSalesFormLineItem(state, {
			uid: "line-2",
			title: "Custom",
			qty: 1,
			unitPrice: 25,
		});

		expect(next.editor.activeItem).toBe("line-2");
		expect(next.record?.lineItems).toHaveLength(2);
		expect(next.record?.summary?.subTotal).toBe(45);
	});

	it("moves active item when removing the active line", () => {
		const state = addSalesFormLineItem(
			{
				...createInitialSalesFormState(),
				record: createRecord(),
			},
			{
				uid: "line-2",
				title: "Custom",
				qty: 1,
				unitPrice: 25,
			},
		);

		const next = removeSalesFormLineItem(state, "line-2");

		expect(next.editor.activeItem).toBe("line-1");
		expect(next.record?.lineItems.map((line) => line.uid)).toEqual(["line-1"]);
	});
});

describe("sales form state summary actions", () => {
	it("recomputes summary when tax rate changes", () => {
		const state = {
			...createInitialSalesFormState(),
			record: createRecord(),
		};

		const next = setSalesFormTaxRate(state, 10);

		expect(next.dirty).toBe(true);
		expect(next.record?.summary?.taxRate).toBe(10);
		expect(next.record?.summary?.taxTotal).toBe(2);
		expect(next.record?.summary?.grandTotal).toBe(22);
	});
});

