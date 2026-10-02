import { describe, expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import {
	categoryStockPolicySchema,
	effectiveLowStockAlert,
	getCategoryStockPolicy,
	readCategoryStockSettings,
	setCategoryStockPolicy,
	variantStockThresholdSchema,
} from "./stock-policy";
function fixture(categories: unknown[]) {
	const writes: unknown[] = [];
	const tx = {
		$queryRaw: async () => [],
		dykeSteps: { findFirst: async () => ({ uid: "jamb" }) },
		inventoryCategory: {
			findMany: async () => categories,
			update: async (args: unknown) => {
				writes.push(args);
			},
		},
		inventory: {
			updateMany: async (args: unknown) => {
				writes.push(args);
			},
		},
	};
	return {
		db: {
			...tx,
			$transaction: async (fn: (tx: unknown) => unknown) => fn(tx),
		} as unknown as Db,
		writes,
	};
}
describe("shared category stock settings", () => {
	test("preserves confirmed physical units when an older client changes tracking", async () => {
		const f = fixture([
			{
				id: 1,
				stockMode: "monitored",
				productKind: "inventory",
				meta: { stockSettings: { stockUnit: "kit" } },
			},
		]);
		await setCategoryStockPolicy(f.db, {
			categoryId: 1,
			tracked: true,
			lowStockAlert: 0,
			promptAvailableStock: false,
		});
		expect(f.writes[0]).toMatchObject({
			data: { meta: { stockSettings: { stockUnit: "kit" } } },
		});
		expect(
			readCategoryStockSettings({ stockSettings: { stockUnit: "unknown" } })
				.stockUnit,
		).toBeNull();
		expect(
			categoryStockPolicySchema.safeParse({
				categoryId: 1,
				tracked: true,
				lowStockAlert: 0,
				promptAvailableStock: false,
				stockUnit: "feet",
			}).success,
		).toBe(false);
	});
	test("validates piece conversion and preserves it for older clients", async () => {
		for (const piecesPerUnit of [0, -1, 1.5, 10001, Infinity]) {
			expect(
				categoryStockPolicySchema.safeParse({
					categoryId: 1,
					tracked: true,
					lowStockAlert: 0,
					promptAvailableStock: false,
					piecesPerUnit,
				}).success,
			).toBe(false);
			expect(
				readCategoryStockSettings({ stockSettings: { piecesPerUnit } })
					.piecesPerUnit,
			).toBe(1);
		}
		const f = fixture([
			{
				id: 1,
				stockMode: "monitored",
				productKind: "inventory",
				meta: { stockSettings: { piecesPerUnit: 2 } },
			},
		]);
		await setCategoryStockPolicy(f.db, {
			categoryId: 1,
			tracked: true,
			lowStockAlert: 0,
			promptAvailableStock: false,
		});
		expect(f.writes[0]).toMatchObject({
			data: { meta: { stockSettings: { piecesPerUnit: 2 } } },
		});
	});
	test("inherits defaults, preserves explicit zero and rejects malformed metadata", () => {
		const meta = {
			stockSettings: { lowStockAlert: 5, promptAvailableStock: true },
		};
		expect(effectiveLowStockAlert(null, meta)).toBe(5);
		expect(effectiveLowStockAlert(0, meta)).toBe(0);
		expect(effectiveLowStockAlert(2, meta)).toBe(2);
		expect(
			readCategoryStockSettings({ stockSettings: { lowStockAlert: -3 } }),
		).toEqual({
			lowStockAlert: 0,
			piecesPerUnit: 1,
			promptAvailableStock: false,
			stockUnit: null,
		});
	});
	test("step and inventory selectors return the same policy", async () => {
		const f = fixture([
			{
				id: 1,
				title: "Jamb",
				stockMode: "monitored",
				productKind: "inventory",
				meta: null,
			},
		]);
		expect(await getCategoryStockPolicy(f.db, { stepId: 8 })).toEqual(
			await getCategoryStockPolicy(f.db, { categoryId: 1 }),
		);
	});
	test("refuses missing or duplicate active category mapping", async () => {
		for (const categories of [[], [{ id: 1 }, { id: 2 }]]) {
			await expect(
				getCategoryStockPolicy(fixture(categories).db, { stepId: 8 }),
			).rejects.toThrow();
		}
	});
	test("enabling stock promotes component identities without losing category metadata", async () => {
		const f = fixture([
			{
				id: 1,
				stockMode: "unmonitored",
				productKind: "component",
				meta: { retained: "yes" },
			},
		]);
		const result = await setCategoryStockPolicy(f.db, {
			categoryId: 1,
			tracked: true,
			lowStockAlert: 0,
			promptAvailableStock: false,
		});
		expect(result.becameTracked).toBe(true);
		expect(f.writes[0]).toMatchObject({
			data: {
				productKind: "inventory",
				meta: { retained: "yes", stockSettings: { lowStockAlert: 0 } },
			},
		});
		expect(f.writes).toHaveLength(2);
	});
	test("disabling tracking preserves physical stock and inventory kind", async () => {
		const f = fixture([
			{ id: 1, stockMode: "monitored", productKind: "inventory", meta: {} },
		]);
		await setCategoryStockPolicy(f.db, {
			categoryId: 1,
			tracked: false,
			lowStockAlert: 5,
			promptAvailableStock: false,
		});
		expect(f.writes).toHaveLength(1);
		expect(f.writes[0]).toMatchObject({ data: { stockMode: "unmonitored" } });
	});
	test("threshold input rejects fractions, negative values and overflow; null restores inheritance", () => {
		for (const lowStockAlert of [-1, 1.5, Number.POSITIVE_INFINITY, 2147483648])
			expect(
				variantStockThresholdSchema.safeParse({
					inventoryVariantId: 1,
					lowStockAlert,
				}).success,
			).toBe(false);
		expect(
			variantStockThresholdSchema.parse({
				inventoryVariantId: 1,
				lowStockAlert: null,
			}).lowStockAlert,
		).toBeNull();
		expect(
			categoryStockPolicySchema.safeParse({
				categoryId: 1,
				tracked: true,
				lowStockAlert: 0,
				promptAvailableStock: false,
			}).success,
		).toBe(true);
	});
});
