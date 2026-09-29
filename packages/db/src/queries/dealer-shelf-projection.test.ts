import { describe, expect, test } from "bun:test";
import { buildDealerShelfProjection } from "./dealer-shelf-projection";

describe("dealer shelf office projection", () => {
	test("allocates exact office cents across rows and preserves catalogue and section identity", () => {
		const result = buildDealerShelfProjection({
			uid: "shelf",
			internalLineTotal: 0.05,
			shelfItems: [0, 1, 2].map((index) => ({
				uid: `p-${index}`,
				categoryId: 16,
				qty: 1,
				unitPrice: 0.02,
				totalPrice: 0.02,
				meta: { categoryIds: [1, 16], sectionUid: "doors", basePrice: 0.01 },
			})),
		});
		expect(result?.shelfItems.map((row) => row.totalPrice)).toEqual([
			0.02, 0.02, 0.01,
		]);
		expect(result?.shelfItems[2]?.meta).toMatchObject({
			basePrice: 0.01,
			categoryIds: [1, 16],
			lineUid: "doors",
			productUid: "p-2",
			salesPrice: 0.01,
		});
	});
	test("converts overrides and calculated prices independently without mutating the dealer recipe", () => {
		const shelf = {
			qty: 2,
			categoryId: 16,
			unitPrice: 50,
			totalPrice: 100,
			meta: { basePrice: 20, salesPrice: 40, customPrice: 50 },
		};
		const result = buildDealerShelfProjection({
			uid: "shelf",
			internalLineTotal: 80,
			shelfItems: [shelf],
		});
		expect(result?.shelfItems[0]).toMatchObject({
			unitPrice: 40,
			totalPrice: 80,
			meta: { basePrice: 20, salesPrice: 32, customPrice: 40 },
		});
		expect(shelf.meta.customPrice).toBe(50);
	});
	test("rejects unreconcilable priced rows instead of persisting a missing office item", () => {
		expect(() =>
			buildDealerShelfProjection({
				uid: "shelf",
				internalLineTotal: 8,
				shelfItems: [{ categoryId: 16, qty: 0, totalPrice: 10 }],
			}),
		).toThrow("quantity");
	});
});
