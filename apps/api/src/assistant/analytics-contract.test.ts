import { describe, expect, test } from "bun:test";
import { buildSalesOverviewInventoryGroups } from "@gnd/sales/sales-inventory-overview";
import {
	ASSISTANT_ANALYTICS_CATALOG_VERSION,
	assistantAnalyticsCatalog,
	assistantAnalyticsQueryIntentSchema,
	getAssistantAnalyticsMetric,
} from "./analytics-contract";

const validIntent = {
	catalogVersion: ASSISTANT_ANALYTICS_CATALOG_VERSION,
	domain: "sales" as const,
	metric: "sales.revenueByPeriod" as const,
	dateRange: { from: "2026-06-01", to: "2026-09-01" },
	filters: [
		{ field: "salesRepId" as const, operator: "eq" as const, value: 7 },
	],
	groupBy: "week" as const,
};

describe("assistant analytics semantic contract", () => {
	test("publishes reviewed scope, lifecycle, unit, freshness and join metadata", () => {
		expect(assistantAnalyticsCatalog.version).toBe(
			ASSISTANT_ANALYTICS_CATALOG_VERSION,
		);
		expect(assistantAnalyticsCatalog.metrics).toHaveLength(6);
		for (const metric of assistantAnalyticsCatalog.metrics) {
			expect(metric.sourceModels.length).toBeGreaterThan(0);
			expect(metric.sourceAuthorities.length).toBeGreaterThan(0);
			expect(
				metric.sourceAuthorities.every((source) =>
					source.path.startsWith("packages/"),
				),
			).toBe(true);
			expect(metric.stableIdFields.length).toBeGreaterThan(0);
			expect(metric.deduplicateBy.length).toBeGreaterThan(0);
			expect(metric.safeOutputFields).toContain("value");
			expect(metric.dateField.length).toBeGreaterThan(0);
			expect(metric.measureField.length).toBeGreaterThan(0);
			expect(["exclude", "include"]).toContain(metric.archivePolicy);
			expect(metric.deletedPolicy).toBe("exclude");
			expect(metric.scopePolicy.length).toBeGreaterThan(0);
			expect(metric.lifecycleAuthority.length).toBeGreaterThan(0);
			expect(metric.sourceRevision.length).toBeGreaterThan(0);
			expect(metric.freshness).toBe("transactional-primary");
		}
		expect(
			getAssistantAnalyticsMetric("community.progressByProject").allowedJoins,
		).toContainEqual(
			expect.objectContaining({ cardinality: "pre-aggregated-one-to-many" }),
		);
		const revenue = getAssistantAnalyticsMetric("sales.revenueByPeriod");
		expect(revenue.currency).toBe("USD");
		expect(revenue.safeOutputFields).toContain("currency");
		expect(revenue.deduplicateBy).toEqual(["SalesOrders.id"]);
	});

	test("keeps every qualified field and join anchored to a declared authority", () => {
		for (const metric of assistantAnalyticsCatalog.metrics) {
			const authorities = new Set(
				metric.sourceAuthorities.map((source) => source.name),
			);
			for (const model of metric.sourceModels) {
				expect(authorities.has(model)).toBe(true);
			}
			const fields = [
				...metric.stableIdFields,
				...metric.deduplicateBy,
				metric.dateField,
				metric.measureField,
				...(metric.currencyField ? [metric.currencyField] : []),
				...metric.filterContracts.map((filter) => filter.sourceField),
			];
			for (const field of fields) {
				expect(authorities.has(field.split(".")[0] ?? "")).toBe(true);
			}
			for (const join of metric.allowedJoins) {
				expect(authorities.has(join.from)).toBe(true);
				expect(authorities.has(join.to)).toBe(true);
			}
		}
	});

	test("keeps executable filter validation aligned with catalog metadata", () => {
		for (const metric of assistantAnalyticsCatalog.metrics) {
			for (const filter of metric.filterContracts) {
				expect(filter.operators).toEqual(
					filter.valueType === "date" ? ["gte", "lte"] : ["eq", "in"],
				);
				if (filter.valueType === "enum") {
					expect(filter.allowedValues?.length).toBeGreaterThan(0);
				}
				const value =
					filter.valueType === "date"
						? "2026-06-01"
						: filter.valueType === "id"
							? 1
							: filter.valueType === "enum"
								? filter.allowedValues?.[0]
								: "pending";
				expect(
					assistantAnalyticsQueryIntentSchema.safeParse({
						catalogVersion: ASSISTANT_ANALYTICS_CATALOG_VERSION,
						domain: metric.domain,
						metric: metric.id,
						dateRange: { from: "2026-06-01", to: "2026-09-01" },
						filters: [
							{ field: filter.field, operator: filter.operators[0], value },
						],
						groupBy: "none",
					}).success,
				).toBe(true);
			}
		}
	});

	test("keeps canonical inventory demand lines distinct and uses derived category identity", () => {
		const groups = buildSalesOverviewInventoryGroups([
			{
				id: 44,
				components: [
					{
						id: 101,
						qty: 2,
						qtyAllocated: 0,
						qtyReceived: 0,
						inventoryId: 7,
						subComponent: { inventoryCategoryId: 91 },
					},
					{
						id: 102,
						qty: 3,
						qtyAllocated: 0,
						qtyReceived: 0,
						inventoryId: 7,
						subComponent: { inventoryCategoryId: 91 },
					},
				],
			} as never,
		]);
		const rows = groups[0]?.rows ?? [];
		expect(rows.map((row) => row.id)).toEqual(["101", "102"]);
		expect(rows.map((row) => row.inventoryCategoryId)).toEqual([91, 91]);
		expect(rows.map((row) => row.qtyPending)).toEqual([2, 3]);
		const metric = getAssistantAnalyticsMetric(
			"inventory.shortageExposureByCategory",
		);
		expect(metric.deduplicateBy).toEqual(["SalesOverviewInventoryLine.id"]);
		expect(
			metric.filterContracts.find((filter) => filter.field === "categoryId")
				?.sourceField,
		).toBe("SalesOverviewInventoryLine.inventoryCategoryId");
	});

	test("parses a bounded metric-specific query intent", () => {
		expect(
			assistantAnalyticsQueryIntentSchema.parse(validIntent),
		).toMatchObject({
			limit: 25,
			sort: { field: "label", direction: "asc" },
		});
	});

	test("rejects arbitrary SQL on an otherwise valid intent", () => {
		expect(
			assistantAnalyticsQueryIntentSchema.safeParse({
				...validIntent,
				sql: "SELECT * FROM Users",
			}).success,
		).toBe(false);
	});

	test("rejects metric-forbidden groupings and filters", () => {
		expect(
			assistantAnalyticsQueryIntentSchema.safeParse({
				...validIntent,
				groupBy: "projectId",
				filters: [],
			}).success,
		).toBe(false);
	});

	test("rejects a metric claimed by the wrong domain", () => {
		expect(
			assistantAnalyticsQueryIntentSchema.safeParse({
				...validIntent,
				domain: "community",
			}).success,
		).toBe(false);
	});

	test("rejects reversed ranges and operator value-shape mismatches", () => {
		expect(
			assistantAnalyticsQueryIntentSchema.safeParse({
				...validIntent,
				dateRange: { from: "2026-09-01", to: "2026-06-01" },
			}).success,
		).toBe(false);
		expect(
			assistantAnalyticsQueryIntentSchema.safeParse({
				...validIntent,
				filters: [{ field: "type", operator: "in", value: "order" }],
			}).success,
		).toBe(false);
		expect(
			assistantAnalyticsQueryIntentSchema.safeParse({
				...validIntent,
				dateRange: { from: "2026-02-30", to: "2026-03-01" },
			}).success,
		).toBe(false);
		expect(
			assistantAnalyticsQueryIntentSchema.safeParse({
				...validIntent,
				dateRange: { from: "2024-01-01", to: "2026-01-02" },
			}).success,
		).toBe(false);
		expect(
			assistantAnalyticsQueryIntentSchema.safeParse({
				...validIntent,
				filters: [{ field: "salesRepId", operator: "eq", value: "not-an-id" }],
			}).success,
		).toBe(false);
		expect(
			assistantAnalyticsQueryIntentSchema.safeParse({
				...validIntent,
				filters: [{ field: "type", operator: "eq", value: "anything" }],
			}).success,
		).toBe(false);
	});
});
