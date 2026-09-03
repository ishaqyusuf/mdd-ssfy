import { describe, expect, it } from "bun:test";
import {
	findQuantityBearingUnpricedHptRows,
	hasQuantityBearingUnpricedHptRows,
	removeQuantityBearingUnpricedHptRows,
	resolveUnpricedHptPersistence,
} from "./unpriced-hpt-rows";

function recordFixture() {
	return {
		type: "quote",
		form: { paymentMethod: "Credit Card" },
		summary: { taxRate: 0 },
		extraCosts: [],
		lineItems: [
			{
				uid: "line-1",
				title: "Entry doors",
				qty: 4,
				unitPrice: 75,
				lineTotal: 300,
				housePackageTool: {
					id: 1,
					doors: [
						{
							id: 10,
							dimension: "2-4 x 8-0",
							lhQty: 1,
							rhQty: 2,
							totalQty: 3,
							unitPrice: 0,
							lineTotal: 0,
							meta: {
								componentTitle: "Door A",
								priceMissing: true,
								pendingUnpricedSizeSwap: true,
							},
						},
						{
							id: 11,
							dimension: "3-0 x 8-0",
							lhQty: 1,
							rhQty: 0,
							totalQty: 1,
							unitPrice: 300,
							lineTotal: 300,
							meta: { componentTitle: "Door A", priceMissing: false },
						},
					],
					totalDoors: 4,
					totalPrice: 300,
				},
			},
		],
	};
}

describe("quantity-bearing unpriced HPT rows", () => {
	it("reports the affected door, size, and handed quantities", () => {
		const record = recordFixture();
		const issues = findQuantityBearingUnpricedHptRows(record);

		expect(hasQuantityBearingUnpricedHptRows(record)).toBe(true);
		expect(issues).toEqual([
			{
				lineUid: "line-1",
				lineTitle: "Entry doors",
				componentTitle: "Door A",
				size: "2-4 x 8-0",
				lhQty: 1,
				rhQty: 2,
				quantity: 3,
			},
		]);
	});

	it("removes only affected rows and recalculates HPT, line, and sale totals", () => {
		const record = recordFixture();
		const result = removeQuantityBearingUnpricedHptRows(record);

		expect(result).not.toBe(record);
		expect(result.lineItems[0]?.housePackageTool?.doors).toHaveLength(1);
		expect(result.lineItems[0]).toMatchObject({
			qty: 1,
			unitPrice: 300,
			lineTotal: 300,
			housePackageTool: { totalDoors: 1, totalPrice: 300 },
		});
		expect(result.summary).toMatchObject({ subTotal: 300, grandTotal: 300 });
		expect(record.lineItems[0]?.housePackageTool?.doors).toHaveLength(2);
	});

	it("preserves each persistence action through cancellation and confirmed removal", () => {
		for (const action of [
			{ kind: "save", intent: "draft" },
			{ kind: "save", intent: "final" },
			{ kind: "save", intent: "close" },
			{ kind: "save", intent: "new" },
			{ kind: "print", openInNewTab: true },
			{ kind: "download-pdf" },
			{ kind: "preview" },
			{ kind: "dealership-save" },
		] as const) {
			const record = recordFixture();
			const pending = resolveUnpricedHptPersistence(record, action);
			expect(pending.requiresConfirmation).toBe(true);
			expect(pending.action).toEqual(action);
			expect(pending.record).toBe(record);
			expect(record.lineItems[0]?.housePackageTool?.doors).toHaveLength(2);

			const confirmed = resolveUnpricedHptPersistence(record, action, true);
			expect(confirmed.requiresConfirmation).toBe(false);
			expect(confirmed.action).toEqual(action);
			expect(
				confirmed.record.lineItems[0]?.housePackageTool?.doors,
			).toHaveLength(1);
			expect(confirmed.record.lineItems[0]?.lineTotal).toBe(300);
		}
	});
});
