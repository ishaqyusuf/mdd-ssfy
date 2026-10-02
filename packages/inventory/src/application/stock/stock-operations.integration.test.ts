import { expect, test } from "bun:test";
import { db } from "@gnd/db";
import { adjustInventoryStock } from "./stock-adjustment";
import { getStockVariantOptions } from "./stock-operation-queries";

const enabled = process.env.GND_STOCK_INTEGRATION === "1";

(enabled ? test : test.skip)(
	"local stock writes serialize concurrent reviewed counts and preserve audit",
	async () => {
		const target = new URL(process.env.DATABASE_URL ?? "");
		if (
			!["localhost", "127.0.0.1"].includes(target.hostname) ||
			target.pathname !== "/gnd-prisma2"
		) {
			throw new Error(
				"Stock integration requires the verified primary local database.",
			);
		}
		const uid = `stock-integration-${crypto.randomUUID()}`;
		const category = await db.inventoryCategory.create({
			data: {
				uid,
				title: "Stock integration fixture",
				stockMode: "unmonitored",
			},
		});
		let inventoryId: number | undefined;
		try {
			const item = await db.inventory.create({
				data: {
					uid,
					name: "Stock integration fixture",
					inventoryCategoryId: category.id,
				},
			});
			inventoryId = item.id;
			const variant = await db.inventoryVariant.create({
				data: { uid, inventoryId: item.id },
			});
			const scoped = await getStockVariantOptions(db, {
				inventoryId: item.id,
				inventoryVariantId: variant.id,
				q: "",
				take: 2,
			});
			expect(scoped.map((row) => row.id)).toEqual([String(variant.id)]);
			const other = await db.inventory.create({
				data: {
					uid: uid + "-other",
					name: "Other selection fixture",
					inventoryCategoryId: category.id,
				},
			});
			try {
				expect(
					await getStockVariantOptions(db, {
						inventoryId: other.id,
						inventoryVariantId: variant.id,
						q: "",
						take: 2,
					}),
				).toEqual([]);
			} finally {
				await db.inventory.update({
					where: { id: other.id },
					data: { deletedAt: new Date() },
				});
			}
			const first = await adjustInventoryStock(db, {
				inventoryVariantId: variant.id,
				qty: 5,
				expectedQty: 0,
				reason: "stock_in",
				authorName: "Stock integration",
			});
			const results = await Promise.allSettled(
				[1, 1].map((qty) =>
					adjustInventoryStock(db, {
						inventoryVariantId: variant.id,
						inventoryStockId: first.inventoryStockId,
						qty,
						expectedQty: 5,
						reason: "stock_in",
						authorName: "Stock integration",
					}),
				),
			);
			expect(
				results.filter((result) => result.status === "fulfilled"),
			).toHaveLength(1);
			expect(
				results.filter((result) => result.status === "rejected"),
			).toHaveLength(1);
			const stock = await db.inventoryStock.findUniqueOrThrow({
				where: { id: first.inventoryStockId },
			});
			expect(stock.qty).toBe(6);
			await adjustInventoryStock(db, {
				inventoryVariantId: variant.id,
				inventoryStockId: stock.id,
				qty: 0,
				mode: "set",
				expectedQty: 6,
				reason: "cycle_count",
				authorName: "Stock integration",
			});
			expect(
				(await db.inventoryStock.findUniqueOrThrow({ where: { id: stock.id } }))
					.qty,
			).toBe(0);
			const movements = await db.stockMovement.findMany({
				where: { inventoryVariantId: variant.id },
				orderBy: { id: "asc" },
			});
			expect(
				movements.map((row) => [row.prevQty, row.currentQty, row.changeQty]),
			).toEqual([
				[0, 5, 5],
				[5, 6, 1],
				[6, 0, -6],
			]);
			expect(
				await db.inventoryLog.count({
					where: {
						inventoryVariantId: variant.id,
						createdBy: "Stock integration",
					},
				}),
			).toBe(3);
		} finally {
			const deletedAt = new Date();
			await db.$transaction(async (tx) => {
				if (inventoryId) {
					await tx.inventoryStock.updateMany({
						where: { inventoryVariant: { inventoryId } },
						data: { deletedAt },
					});
					await tx.inventoryVariant.updateMany({
						where: { inventoryId },
						data: { deletedAt },
					});
					await tx.inventory.update({
						where: { id: inventoryId },
						data: { deletedAt },
					});
				}
				await tx.inventoryCategory.update({
					where: { id: category.id },
					data: { deletedAt },
				});
			});
		}
	},
);
