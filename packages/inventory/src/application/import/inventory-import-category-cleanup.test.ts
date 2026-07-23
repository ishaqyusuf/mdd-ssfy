import { describe, expect, it, mock } from "bun:test";
import type { Db } from "@gnd/db";
import { tasks } from "@trigger.dev/sdk/v3";
import {
	cleanupInventoryImportCategories,
	inventoryImportCategoryCleanupReview,
} from "./inventory-import-category-cleanup";

function createDb() {
	let updateCount = 0;
	const categoryRows = [
		{
			id: 10,
			uid: "stale-step",
			title: "Stale empty category",
			inventories: [],
		},
		{
			id: 11,
			uid: "stale-step",
			title: "Stale occupied category",
			inventories: [{ sourceCustom: false }, { sourceCustom: true }],
		},
	];
	const findMany = mock(
		async (args: {
			select?: { id?: boolean; inventories?: unknown; productKind?: boolean };
		}) => {
			if (args.select?.inventories) return categoryRows;
			if (args.select?.productKind) {
				return [
					{
						id: 20,
						uid: "active-step",
						title: "Active category",
						productKind: "inventory",
					},
				];
			}
			return [{ uid: "stale-step" }];
		},
	);
	const updateMany = mock(async () => {
		updateCount += 1;
		return { count: 1 };
	});
	const db = {
		settings: {
			findFirst: async () => ({ meta: null }),
		},
		dykeSteps: {
			findMany: async () => [
				{
					id: 1,
					uid: "active-step",
					title: "Active step",
					stepProducts: [],
					priceSystem: [],
				},
				{
					id: 2,
					uid: "stale-step",
					title: "Stale step",
					stepProducts: [],
					priceSystem: [],
				},
			],
		},
		inventoryCategory: {
			findMany,
			updateMany,
		},
		$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
			callback(db),
	} as unknown as Db;

	return {
		db,
		findMany,
		updateMany,
		getUpdateCount: () => updateCount,
	};
}

describe("inventory import category cleanup", () => {
	it("marks only empty stale categories ready for cleanup", async () => {
		const { db, findMany } = createDb();

		const review = await inventoryImportCategoryCleanupReview(db, {
			limit: 50,
		});

		expect(review.meta).toMatchObject({
			staleCategoryCount: 1,
			ready: 1,
			blocked: 1,
		});
		expect(review.targetCategories).toEqual([
			{
				id: 20,
				uid: "active-step",
				title: "Active category",
				productKind: "inventory",
			},
		]);
		expect(findMany.mock.calls[0]?.[0]).toMatchObject({
			where: { deletedAt: null },
			select: { uid: true },
		});
		expect(review.candidates).toEqual([
			expect.objectContaining({
				categoryId: 10,
				activeInventoryCount: 0,
				status: "ready",
			}),
			expect.objectContaining({
				categoryId: 11,
				activeInventoryCount: 2,
				activeStandardCount: 1,
				activeCustomCount: 1,
				status: "blocked",
				blockingReason: "active_inventory_rows",
			}),
		]);
	});

	it("keeps compare read-only and rechecks before guarded category archive", async () => {
		const { db, getUpdateCount, updateMany } = createDb();
		Reflect.set(
			tasks,
			"trigger",
			mock(async () => ({ id: "category-sync-run" })),
		);

		const compared = await cleanupInventoryImportCategories(db, {
			categoryIds: [10, 11],
			apply: false,
		});
		expect(compared).toMatchObject({
			mode: "compare",
			archivedCategoryIds: [],
			queuedSyncCount: 0,
			skipped: [{ categoryId: 11, reason: "active_inventory_rows" }],
		});
		expect(getUpdateCount()).toBe(0);

		const applied = await cleanupInventoryImportCategories(db, {
			categoryIds: [10, 11],
			apply: true,
		});
		expect(applied).toMatchObject({
			mode: "apply",
			archivedCategoryIds: [10],
			queuedSyncCount: 1,
			skipped: [{ categoryId: 11, reason: "active_inventory_rows" }],
		});
		expect(updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: 10,
					deletedAt: null,
					inventories: { none: { deletedAt: null } },
				}),
			}),
		);
		expect(tasks.trigger).toHaveBeenCalledWith(
			"sync-inventory-to-dyke",
			expect.objectContaining({
				inventoryCategoryId: 10,
				mode: "sync",
				source: "repair",
			}),
		);
	});
});
