import { describe, expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import { adjustInventoryStock } from "./stock-adjustment";
import {
	manualStockAdjustmentSchema,
	stockVariantOptionsSchema,
} from "./stock-operation-schema";

function fixture({
	qty = 10,
	allocated = 0,
	exists = true,
	stockUnit = null as string | null,
} = {}) {
	const writes: Array<{ kind: string; data: Record<string, unknown> }> = [];
	const locks: unknown[] = [];
	const tx = {
		$queryRaw: async (sql: unknown) => {
			locks.push(sql);
			return [];
		},
		inventoryVariant: {
			findFirstOrThrow: async () => ({
				id: 1,
				inventoryId: 2,
				inventory: {
					inventoryCategory: { meta: { stockSettings: { stockUnit } } },
				},
			}),
		},
		inventoryStock: {
			findFirst: async () =>
				exists ? { id: 3, qty, inventoryVariant: { inventoryId: 2 } } : null,
			findFirstOrThrow: async () => ({
				id: 3,
				qty,
				inventoryVariant: { inventoryId: 2 },
			}),
			update: async ({ data }: { data: Record<string, unknown> }) => {
				writes.push({ kind: "stock", data });
				return { id: 3 };
			},
			create: async ({ data }: { data: Record<string, unknown> }) => {
				writes.push({ kind: "stock", data });
				return { id: 3 };
			},
		},
		stockAllocation: { aggregate: async () => ({ _sum: { qty: allocated } }) },
		stockMovement: {
			create: async ({ data }: { data: Record<string, unknown> }) => {
				writes.push({ kind: "movement", data });
				return { id: 4 };
			},
		},
		inventoryLog: {
			create: async ({ data }: { data: Record<string, unknown> }) => {
				writes.push({ kind: "log", data });
				return { id: 5 };
			},
		},
	};
	const db = {
		$transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
	} as unknown as Db;
	return { db, writes, locks };
}

describe("manual stock operations", () => {
	test("opening counts require confirmed units and an exact zero baseline, and retain audit context", async () => {
		const input = {
			inventoryVariantId: 1,
			qty: 3,
			expectedQty: 0,
			mode: "set" as const,
			reason: "cycle_count" as const,
			openingCount: true,
			reference: "Warehouse count 2026-10-01",
		};
		const missing = fixture({ qty: 0 });
		await expect(adjustInventoryStock(missing.db, input)).rejects.toMatchObject(
			{ code: "BAD_REQUEST" },
		);
		expect(missing.writes).toHaveLength(0);
		const count = fixture({ qty: 0, exists: false, stockUnit: "kit" });
		expect(await adjustInventoryStock(count.db, input)).toMatchObject({
			previousQty: 0,
			currentQty: 3,
			changeQty: 3,
		});
		expect(count.writes[1]?.data.notes).toContain("Opening count (kit)");
		await expect(
			adjustInventoryStock(fixture({ qty: 3, stockUnit: "kit" }).db, {
				...input,
				expectedQty: 3,
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});
	test("adds stock and records the before/after audit in one transaction", async () => {
		const f = fixture();
		const result = await adjustInventoryStock(f.db, {
			inventoryVariantId: 1,
			qty: 5,
			expectedQty: 10,
			reason: "stock_in",
			authorName: "Operator",
		});
		expect(result).toMatchObject({
			previousQty: 10,
			currentQty: 15,
			changeQty: 5,
		});
		expect(f.locks).toHaveLength(2);
		expect(f.writes.map((w) => w.kind)).toEqual(["stock", "movement", "log"]);
		expect(f.writes[1]?.data).toMatchObject({
			prevQty: 10,
			currentQty: 15,
			authorName: "Operator",
		});
	});

	test("creates the first stock row with matching movement and log", async () => {
		const f = fixture({ exists: false });
		const result = await adjustInventoryStock(f.db, {
			inventoryVariantId: 1,
			qty: 6,
			expectedQty: 0,
			reason: "stock_in",
			location: "Bin A",
		});
		expect(result).toMatchObject({ previousQty: 0, currentQty: 6 });
		expect(f.writes[0]?.data).toMatchObject({ qty: 6, location: "Bin A" });
	});

	test("sets a counted quantity without treating it as an increment", async () => {
		const f = fixture();
		const result = await adjustInventoryStock(f.db, {
			inventoryVariantId: 1,
			inventoryStockId: 3,
			qty: 7,
			mode: "set",
			expectedQty: 10,
			reason: "cycle_count",
		});
		expect(result).toMatchObject({ currentQty: 7, changeQty: -3 });
	});

	test("rejects stale counts before any writes", async () => {
		const f = fixture();
		await expect(
			adjustInventoryStock(f.db, {
				inventoryVariantId: 1,
				qty: 5,
				expectedQty: 9,
				reason: "stock_in",
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(f.writes).toHaveLength(0);
	});

	test("protects allocations before reducing stock", async () => {
		const f = fixture({ allocated: 8 });
		await expect(
			adjustInventoryStock(f.db, {
				inventoryVariantId: 1,
				qty: 7,
				mode: "set",
				expectedQty: 10,
				reason: "cycle_count",
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(f.writes).toHaveLength(0);
	});

	test("rejects negative counts and no-op adjustments without audit writes", async () => {
		for (const qty of [-11, 0]) {
			const f = fixture();
			await expect(
				adjustInventoryStock(f.db, {
					inventoryVariantId: 1,
					qty,
					expectedQty: 10,
					reason: "correction",
				}),
			).rejects.toMatchObject({ code: "BAD_REQUEST" });
			expect(f.writes).toHaveLength(0);
		}
	});

	test("rejects reasons with the wrong movement direction", async () => {
		for (const [qty, reason] of [
			[-1, "stock_in"],
			[1, "damage"],
			[1, "consume"],
		] as const) {
			const f = fixture();
			await expect(
				adjustInventoryStock(f.db, {
					inventoryVariantId: 1,
					qty,
					expectedQty: 10,
					reason,
				}),
			).rejects.toMatchObject({ code: "BAD_REQUEST" });
			expect(f.writes).toHaveLength(0);
		}
	});

	test("validates IDs, finite quantities, reviewed baseline and bounded searches", () => {
		const base = {
			inventoryVariantId: 1,
			qty: 5,
			expectedQty: 0,
			reason: "stock_in",
		};
		for (const invalid of [
			{ ...base, inventoryVariantId: -1 },
			{ ...base, inventoryStockId: 1.2 },
			{ ...base, qty: Number.POSITIVE_INFINITY },
			{ ...base, expectedQty: undefined },
			{ ...base, unitPrice: -1 },
		]) {
			expect(manualStockAdjustmentSchema.safeParse(invalid).success).toBe(
				false,
			);
		}
		expect(stockVariantOptionsSchema.safeParse({ take: 31 }).success).toBe(
			false,
		);
		expect(stockVariantOptionsSchema.parse({})).toEqual({ q: "", take: 20 });
	});
});

describe("contextual stock selection", () => {
	test("validates contextual identities independently of the search limit", () => {
		for (const input of [
			{ inventoryId: -1 },
			{ inventoryVariantId: 1.5 },
			{ inventoryId: 0 },
		]) {
			expect(stockVariantOptionsSchema.safeParse(input).success).toBe(false);
		}
		expect(
			stockVariantOptionsSchema.parse({
				inventoryId: 27,
				inventoryVariantId: 501,
				take: 2,
			}),
		).toEqual({ inventoryId: 27, inventoryVariantId: 501, q: "", take: 2 });
	});
});
