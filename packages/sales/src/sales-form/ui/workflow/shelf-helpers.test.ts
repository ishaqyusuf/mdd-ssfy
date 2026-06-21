// @ts-expect-error packages/sales typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";

import {
	getShelfChildCategories,
	getShelfLeafCategoryIds,
	getShelfRowBasePrice,
	getShelfRowDisplayUnitPrice,
	getShelfRowSalesPrice,
} from "./shelf-helpers";

describe("shelf helpers", () => {
	it("resolves parent/child category traversal without importing web UI", () => {
		const categories = [
			{ id: 1, name: "Shelves", type: "parent" },
			{ id: 2, name: "Closet", categoryId: 1 },
			{ id: 3, name: "White", categoryId: 2 },
			{ id: 4, name: "Oak", categoryId: 1 },
		];

		expect(getShelfChildCategories(categories, null).map((item) => item.id)).toEqual([
			1,
		]);
		expect(getShelfLeafCategoryIds(categories, 1)).toEqual([3, 4]);
	});

	it("prefers custom shelf row pricing before calculated pricing", () => {
		expect(
			getShelfRowDisplayUnitPrice({
				customPrice: 18,
				salesPrice: 14,
				unitPrice: 12,
				meta: {
					customPrice: 16,
				},
			}),
		).toBe(18);
	});

	it("reads shelf row prices from JSON metadata", () => {
		const row = {
			qty: 2,
			meta: JSON.stringify({
				basePrice: 10,
				salesPrice: 14,
				customPrice: 16,
				unitPrice: 14,
			}),
		};

		expect(getShelfRowBasePrice(row)).toBe(10);
		expect(getShelfRowSalesPrice(row)).toBe(14);
		expect(getShelfRowDisplayUnitPrice(row)).toBe(16);
	});
});
