import { describe, expect, it, mock } from "bun:test";
import type { Db } from "@gnd/db";
import { tasks } from "@trigger.dev/sdk/v3";
import {
	archiveInventoryImportSourceCandidates,
	classifyInventoryImportSourceReview,
} from "./inventory-import-source-review";

const sets = {
	knownStepUids: new Set(["active-step", "old-step"]),
	activeStepUids: new Set(["active-step"]),
};

function classify(
	overrides: Partial<
		Parameters<typeof classifyInventoryImportSourceReview>[0]
	> = {},
) {
	return classifyInventoryImportSourceReview({
		inventoryId: 1,
		inventoryUid: "inventory-1",
		inventoryName: "Imported item",
		categoryId: 10,
		categoryUid: "old-step",
		categoryTitle: "Old step",
		sourceStepUid: "old-step",
		sourceComponentUid: "component-1",
		sourceCustom: false,
		productKind: "inventory",
		usage: {
			activeVariants: 1,
			positiveStockRows: 0,
			activeLineItems: 0,
			activeLineItemComponents: 0,
			activeAllocations: 0,
			activeInboundDemands: 0,
			storefrontPublished: false,
		},
		...sets,
		...overrides,
	});
}

describe("inventory import source review", () => {
	it("marks unreferenced standard imports from excluded steps as archive candidates", () => {
		expect(classify()).toEqual({
			reason: "excluded_source_step",
			status: "archive_candidate",
			protectedReasons: [],
		});
	});

	it("keeps custom imports in explicit review instead of auto-archive", () => {
		expect(classify({ sourceCustom: true })).toEqual({
			reason: "excluded_source_step",
			status: "custom_review",
			protectedReasons: [],
		});
	});

	it("blocks archive when imported inventory is still operationally referenced", () => {
		expect(
			classify({
				usage: {
					activeVariants: 2,
					positiveStockRows: 1,
					activeLineItems: 0,
					activeLineItemComponents: 0,
					activeAllocations: 0,
					activeInboundDemands: 0,
					storefrontPublished: false,
				},
			}),
		).toEqual({
			reason: "excluded_source_step",
			status: "protected",
			protectedReasons: ["positive_stock"],
		});
	});

	it("distinguishes orphaned source labels from excluded configured steps", () => {
		expect(
			classify({
				sourceStepUid: "removed-step",
				knownStepUids: new Set(["active-step", "old-step"]),
			}),
		).toEqual({
			reason: "unknown_source_step",
			status: "archive_candidate",
			protectedReasons: [],
		});
		expect(
			classify({
				sourceStepUid: null,
				sourceComponentUid: "component-1",
			}),
		).toEqual({
			reason: "missing_source_step",
			status: "archive_candidate",
			protectedReasons: [],
		});
	});

	it("keeps archive compare read-only and applies only reviewed standard rows", async () => {
		const row = {
			id: 11,
			uid: "inventory-11",
			name: "Old imported item",
			productKind: "inventory",
			sourceStepUid: "old-step",
			sourceComponentUid: "component-1",
			sourceCustom: false,
			publishedAt: null,
			primaryStoreFront: false,
			inventoryCategory: {
				id: 10,
				uid: "old-step",
				title: "Old step",
			},
			variants: [
				{
					_count: {
						stocks: 0,
						stockAllocations: 0,
						inboundDemands: 0,
					},
				},
			],
			_count: {
				lineItems: 0,
				lineItemComponents: 0,
			},
		};
		let updateCount = 0;
		const db = {
			settings: { findFirst: async () => ({ meta: null }) },
			dykeSteps: { findMany: async () => [] },
			inventoryCategory: { findMany: async () => [] },
			inventory: {
				findMany: async () => [row],
				updateMany: async () => {
					updateCount += 1;
					return { count: 1 };
				},
			},
			$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
				callback(db),
		} as unknown as Db;
		Reflect.set(
			tasks,
			"trigger",
			mock(async () => ({ id: "archive-run" })),
		);

		const compared = await archiveInventoryImportSourceCandidates(db, {
			inventoryIds: [11],
			apply: false,
		});
		expect(compared.mode).toBe("compare");
		expect(compared.archivedIds).toEqual([]);
		expect(updateCount).toBe(0);

		const applied = await archiveInventoryImportSourceCandidates(db, {
			inventoryIds: [11],
			apply: true,
		});
		expect(applied.mode).toBe("apply");
		expect(applied.archivedIds).toEqual([11]);
		expect(applied.queuedSyncCount).toBe(1);
		expect(applied.skipped).toEqual([]);
	});
});
