import { describe, expect, test } from "bun:test";
import { ASSISTANT_ANALYTICS_CATALOG_VERSION } from "./analytics-contract";
import { createAssistantAnalyticsCanonicalAdapter } from "./analytics-projections";
import {
	compileAssistantAnalyticsQueryPlan,
	executeAssistantAnalyticsQueryPlan,
} from "./analytics-query-plan";

const authority = {
	grants: { viewOrders: true, viewInventory: true },
	salesOrderIds: [1, 2],
	timezone: "UTC",
};

function intent(metric: string, groupBy: string, filters: unknown[] = []) {
	return {
		catalogVersion: ASSISTANT_ANALYTICS_CATALOG_VERSION,
		domain: metric.startsWith("fulfillment")
			? "fulfillment"
			: metric.startsWith("inventory")
				? "inventory"
				: "sales",
		metric,
		dateRange: { from: "2026-08-01", to: "2026-08-31" },
		filters,
		groupBy,
		sort: { field: "label", direction: "asc" },
		limit: 25,
	};
}

const scopedRows = [
	{ id: 1, type: "order", salesRepId: 10 },
	{ id: 2, type: "order", salesRepId: 11 },
];

describe("assistant analytics canonical projections", () => {
	test("counts canonical pipeline status after scoped ID selection", async () => {
		const plan = compileAssistantAnalyticsQueryPlan(
			intent("sales.orderCountByStatus", "status"),
			authority,
		);
		const adapter = createAssistantAnalyticsCanonicalAdapter({
			loadPipelineSnapshots: async (_ids, _signal, budget) => {
				budget.claimQuery(4);
				return new Map([
					[1, { headline: { code: "fulfilled" }, blockers: [] }],
					[2, { headline: { code: "fulfilled" }, blockers: [] }],
				]);
			},
			loadInventoryLines: async (_ids, _signal, budget) => {
				budget.claimQuery();
				return [];
			},
		});
		const result = await executeAssistantAnalyticsQueryPlan(
			plan,
			async () => scopedRows,
			{ canonicalAdapter: adapter },
		);
		expect(result.rows).toEqual([{ label: "fulfilled", value: 2 }]);
		expect(result.queryCount).toBe(5);
	});

	test("filters payment blockers and deduplicates inventory projection identity", async () => {
		const loaders = {
			loadPipelineSnapshots: async (_ids, _signal, budget) => {
				budget.claimQuery(4);
				return new Map([
					[
						1,
						{
							headline: { code: "blocked" },
							blockers: [
								{ code: "awaiting_payment", dimension: "payment" },
								{ code: "awaiting_material", dimension: "material" },
							],
						},
					],
					[2, { headline: { code: "fulfilled" }, blockers: [] }],
				]);
			},
			loadInventoryLines: async (_ids, _signal, budget) => {
				budget.claimQuery();
				return [
					{
						id: "component:7",
						salesOrderId: 1,
						inventoryCategoryId: 91,
						qtyPending: 3,
					},
					{
						id: "component:7",
						salesOrderId: 1,
						inventoryCategoryId: 91,
						qtyPending: 3,
					},
					{
						id: "component:8",
						salesOrderId: 2,
						inventoryCategoryId: 91,
						qtyPending: 2,
					},
				];
			},
		};
		const adapter = createAssistantAnalyticsCanonicalAdapter(loaders);
		const blockers = compileAssistantAnalyticsQueryPlan(
			intent("fulfillment.blockersByReason", "reason"),
			authority,
		);
		const blockerResult = await executeAssistantAnalyticsQueryPlan(
			blockers,
			async () => scopedRows,
			{ canonicalAdapter: adapter },
		);
		expect(blockerResult.rows).toEqual([
			{ label: "awaiting_material", value: 1 },
		]);
		const inventory = compileAssistantAnalyticsQueryPlan(
			intent("inventory.shortageExposureByCategory", "categoryId"),
			authority,
		);
		const inventoryResult = await executeAssistantAnalyticsQueryPlan(
			inventory,
			async () => scopedRows,
			{ canonicalAdapter: adapter },
		);
		expect(inventoryResult.rows).toEqual([{ label: "91", value: 5 }]);
	});

	test("fails closed when a projection plan has no canonical adapter", async () => {
		const plan = compileAssistantAnalyticsQueryPlan(
			intent("sales.orderCountByStatus", "status"),
			authority,
		);
		await expect(
			executeAssistantAnalyticsQueryPlan(plan, async () => scopedRows),
		).rejects.toThrow("adapter is unavailable");
	});

	test("fails closed for partial snapshots, conflicting lines, and excess query work", async () => {
		const status = compileAssistantAnalyticsQueryPlan(
			intent("sales.orderCountByStatus", "status"),
			authority,
		);
		const partial = createAssistantAnalyticsCanonicalAdapter({
			loadPipelineSnapshots: async (_ids, _signal, budget) => {
				budget.claimQuery(4);
				return new Map([
					[1, { headline: { code: "fulfilled" }, blockers: [] }],
				]);
			},
			loadInventoryLines: async (_ids, _signal, budget) => {
				budget.claimQuery();
				return [];
			},
		});
		await expect(
			executeAssistantAnalyticsQueryPlan(status, async () => scopedRows, {
				canonicalAdapter: partial,
			}),
		).rejects.toThrow("snapshot set is incomplete");

		const excessive = createAssistantAnalyticsCanonicalAdapter({
			loadPipelineSnapshots: async (_ids, _signal, budget) => {
				budget.claimQuery(99);
				return new Map([
					[1, { headline: { code: "fulfilled" }, blockers: [] }],
					[2, { headline: { code: "fulfilled" }, blockers: [] }],
				]);
			},
			loadInventoryLines: async (_ids, _signal, budget) => {
				budget.claimQuery();
				return [];
			},
		});
		await expect(
			executeAssistantAnalyticsQueryPlan(status, async () => scopedRows, {
				canonicalAdapter: excessive,
			}),
		).rejects.toThrow("query count limit");

		const inventory = compileAssistantAnalyticsQueryPlan(
			intent("inventory.shortageExposureByCategory", "categoryId"),
			authority,
		);
		const conflicting = createAssistantAnalyticsCanonicalAdapter({
			loadPipelineSnapshots: async (_ids, _signal, budget) => {
				budget.claimQuery();
				return new Map();
			},
			loadInventoryLines: async (_ids, _signal, budget) => {
				budget.claimQuery();
				return [
					{
						id: "same",
						salesOrderId: 1,
						inventoryCategoryId: 91,
						qtyPending: 2,
					},
					{
						id: "same",
						salesOrderId: 1,
						inventoryCategoryId: 91,
						qtyPending: 3,
					},
				];
			},
		});
		await expect(
			executeAssistantAnalyticsQueryPlan(inventory, async () => scopedRows, {
				canonicalAdapter: conflicting,
			}),
		).rejects.toThrow("Conflicting canonical inventory");
	});

	test("bounds scoped rows before invoking a canonical loader", async () => {
		const plan = compileAssistantAnalyticsQueryPlan(
			intent("sales.orderCountByStatus", "status"),
			authority,
		);
		let invoked = false;
		const adapter = createAssistantAnalyticsCanonicalAdapter({
			loadPipelineSnapshots: async (_ids, _signal, budget) => {
				invoked = true;
				budget.claimQuery();
				return new Map();
			},
			loadInventoryLines: async (_ids, _signal, budget) => {
				budget.claimQuery();
				return [];
			},
		});
		await expect(
			executeAssistantAnalyticsQueryPlan(
				{ ...plan, bounds: { ...plan.bounds, maxRows: 1 } },
				async () => scopedRows,
				{ canonicalAdapter: adapter },
			),
		).rejects.toThrow("scoped query row limit");
		expect(invoked).toBe(false);
	});

	test("returns an empty metric without invoking loaders when scope query has no rows", async () => {
		for (const [metric, groupBy] of [
			["sales.orderCountByStatus", "status"],
			["fulfillment.blockersByReason", "reason"],
			["inventory.shortageExposureByCategory", "categoryId"],
		] as const) {
			const plan = compileAssistantAnalyticsQueryPlan(
				intent(metric, groupBy),
				authority,
			);
			const adapter = createAssistantAnalyticsCanonicalAdapter({
				loadPipelineSnapshots: async () => {
					throw new Error("loader must not run");
				},
				loadInventoryLines: async () => {
					throw new Error("loader must not run");
				},
			});
			const result = await executeAssistantAnalyticsQueryPlan(
				plan,
				async () => [],
				{
					canonicalAdapter: adapter,
				},
			);
			expect(result.rows).toEqual([]);
			expect(result.queryCount).toBe(1);
		}
	});
});
