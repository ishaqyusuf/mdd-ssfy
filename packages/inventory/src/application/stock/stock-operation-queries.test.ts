import { describe, expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import {
	getStockVariantBalances,
	getStockVariantContext,
} from "./stock-operation-queries";

describe("exact inventory selection context", () => {
	test("the same door size on a different product is not a duplicate", async () => {
		const selected = {
			id: 11,
			uid: "w2_8-h6_8",
			inventoryId: 53,
			stocks: [],
			inventory: { name: "Rockport", inventoryCategory: { meta: {} } },
		};
		const candidates = [
			{
				id: 28,
				uid: selected.uid,
				inventoryId: 54,
				inventory: { name: "Plantation" },
			},
		];
		const db = {
			inventoryVariant: {
				findFirstOrThrow: async () => selected,
				findMany: async ({ where }) =>
					candidates.filter(
						(row) =>
							row.uid === where.uid && row.inventoryId === where.inventoryId,
					),
			},
		} as unknown as Db;
		expect((await getStockVariantContext(db, 11)).identityWarnings).toEqual([]);
		candidates.push({
			id: 29,
			uid: selected.uid,
			inventoryId: 53,
			inventory: { name: "Rockport" },
		});
		expect((await getStockVariantContext(db, 11)).identityWarnings).toEqual([
			"This product has duplicate selections. Review the catalog before combining physical counts.",
		]);
	});
	test("availability excludes committed stock per bucket and uses the product gallery fallback", async () => {
		const image = { path: "hinge.jpg", bucket: "dyke", provider: "cloudinary" };
		const db = {
			inventoryVariant: {
				findMany: async () => [
					{
						id: 1973,
						img: null,
						images: [],
						inventory: { img: null, images: [{ imageGallery: image }] },
						stocks: [
							{ id: 1, qty: 10, location: "Main", supplier: null },
							{ id: 2, qty: 2, location: "Workshop", supplier: null },
						],
					},
				],
			},
			stockAllocation: {
				groupBy: async (input) => {
					expect(input.where.status.in).toEqual([
						"approved",
						"reserved",
						"picked",
						"consumed",
					]);
					return [
						{ inventoryStockId: 1, _sum: { qty: 7 } },
						{ inventoryStockId: 2, _sum: { qty: 3 } },
					];
				},
			},
		} as unknown as Db;
		const [balance] = await getStockVariantBalances(db, [1973]);
		expect(balance).toMatchObject({
			image,
			qty: 12,
			reservedQty: 10,
			availableQty: 3,
		});
		expect(balance?.stocks.map((stock) => stock.availableQty)).toEqual([3, 0]);
	});
	test("physical-count protection includes allocations awaiting review", async () => {
		const db = {
			inventoryVariant: {
				findFirstOrThrow: async () => ({
					id: 1,
					uid: "size",
					inventoryId: 1,
					stocks: [{ id: 1, qty: 10 }],
					inventory: { inventoryCategory: { meta: {} } },
				}),
				findMany: async () => [],
			},
			stockAllocation: {
				groupBy: async (input) => {
					expect(input.where.status.in).toContain("pending_review");
					return [{ inventoryStockId: 1, _sum: { qty: 7 } }];
				},
			},
		} as unknown as Db;
		expect((await getStockVariantContext(db, 1)).stocks[0]?.allocatedQty).toBe(
			7,
		);
	});
});
