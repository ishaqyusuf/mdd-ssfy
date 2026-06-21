import { describe, expect, it } from "bun:test";
import {
	buildShelfProductRowPatch,
	clearShelfRowProduct,
	clearShelfRowCustomPrice,
	patchShelfRowPrice,
	patchShelfRowQty,
} from "./shelf-row-products";

describe("shelf row product pricing", () => {
	it("stores direct shelf price edits as custom prices", () => {
		const row = {
			qty: 2,
			salesPrice: 15,
			unitPrice: 15,
			totalPrice: 30,
			meta: { salesPrice: 15, unitPrice: 15 },
		};

		const patch = patchShelfRowPrice(row, 18);

		expect(patch.customPrice).toBe(18);
		expect(patch.unitPrice).toBe(18);
		expect(patch.totalPrice).toBe(36);
		expect(patch.meta.customPrice).toBe(18);
	});

	it("stores direct shelf price edits without spreading JSON metadata", () => {
		const row = {
			qty: 2,
			salesPrice: 15,
			unitPrice: 15,
			totalPrice: 30,
			meta: JSON.stringify({
				preserved: "yes",
				salesPrice: 15,
				unitPrice: 15,
			}),
		};

		const patch = patchShelfRowPrice(row as any, 18);

		expect(patch.meta.preserved).toBe("yes");
		expect(Object.keys(patch.meta || {})).not.toContain("0");
		expect(patch.meta.customPrice).toBe(18);
		expect(patch.meta.unitPrice).toBe(18);
	});

	it("clears custom shelf prices back to calculated sales pricing", () => {
		const row = {
			qty: 3,
			basePrice: 10,
			salesPrice: 12,
			customPrice: 20,
			unitPrice: 20,
			totalPrice: 60,
			meta: {
				basePrice: 10,
				salesPrice: 12,
				customPrice: 20,
				unitPrice: 20,
			},
		};

		const patch = clearShelfRowCustomPrice(row);

		expect(patch.customPrice).toBeNull();
		expect(patch.unitPrice).toBe(12);
		expect(patch.totalPrice).toBe(36);
		expect(patch.meta.customPrice).toBeNull();
		expect(patch.meta.unitPrice).toBe(12);
	});

	it("clears custom shelf prices from JSON metadata", () => {
		const row = {
			qty: 3,
			customPrice: 20,
			unitPrice: 20,
			totalPrice: 60,
			meta: JSON.stringify({
				preserved: true,
				basePrice: 10,
				salesPrice: 12,
				customPrice: 20,
				unitPrice: 20,
			}),
		};

		const patch = clearShelfRowCustomPrice(row as any);

		expect(patch.customPrice).toBeNull();
		expect(patch.unitPrice).toBe(12);
		expect(patch.totalPrice).toBe(36);
		expect(patch.meta.preserved).toBe(true);
		expect(Object.keys(patch.meta || {})).not.toContain("0");
		expect(patch.meta.customPrice).toBeNull();
	});

	it("uses the display unit price when quantity changes", () => {
		const patch = patchShelfRowQty(
			{
				qty: 1,
				salesPrice: 12,
				customPrice: 20,
				unitPrice: 20,
				totalPrice: 20,
			},
			4,
		);

		expect(patch.totalPrice).toBe(80);
	});

	it("uses JSON metadata display price when quantity changes", () => {
		const patch = patchShelfRowQty(
			{
				qty: 1,
				totalPrice: 16,
				meta: JSON.stringify({
					customPrice: 16,
					salesPrice: 12,
				}),
			} as any,
			4,
		);

		expect(patch.totalPrice).toBe(64);
	});

	it("clears product selection without spreading JSON metadata", () => {
		const patch = clearShelfRowProduct({
			qty: 2,
			categoryId: 20,
			productId: 101,
			description: "Panel",
			meta: JSON.stringify({
				preserved: "yes",
				categoryIds: [10, 20],
				shelfParentCategoryId: 10,
			}),
		} as any);

		expect(patch.categoryId).toBeNull();
		expect(patch.productId).toBeNull();
		expect(patch.meta.preserved).toBe("yes");
		expect(patch.meta.categoryIds).toEqual([]);
		expect(Object.keys(patch.meta || {})).not.toContain("0");
	});

	it("builds product row patches without spreading JSON metadata", () => {
		const patch = buildShelfProductRowPatch({
			row: {
				qty: 2,
				meta: JSON.stringify({
					preserved: "yes",
					productRowUid: "row-1",
				}),
			} as any,
			product: {
				id: 101,
				title: "Panel",
				unitPrice: 20,
				categoryId: 7,
				parentCategoryId: 3,
			},
			categories: [],
			profileCoefficient: 2,
		});

		expect(patch.productId).toBe(101);
		expect(patch.unitPrice).toBe(10);
		expect(patch.totalPrice).toBe(20);
		expect(patch.meta.preserved).toBe("yes");
		expect(patch.meta.categoryIds).toEqual([3, 7]);
		expect(Object.keys(patch.meta || {})).not.toContain("0");
	});
});
