import { describe, expect, test } from "bun:test";

import {
	buildSalesInventoryReconciliationSummary,
	buildSalesInventorySyncMonitor,
	cleanupStaleSalesInventoryLineItems,
} from "./sales-inventory-sync-monitor";

const emptyCounts = {
	totalSalesCount: 0,
	syncedSalesCount: 0,
	missingSalesCount: 0,
	inventoryLineItemCount: 0,
	componentCount: 0,
	requiredComponentCount: 0,
	componentlessLineItemCount: 0,
	componentlessSalesCount: 0,
	pendingReviewComponentCount: 0,
	awaitingInboundComponentCount: 0,
	allocatedComponentCount: 0,
	fulfilledComponentCount: 0,
	staleInventoryLineItemCount: 0,
	staleStockAllocationCount: 0,
	staleInboundDemandCount: 0,
	nextUnsyncedSalesOrderId: null,
};

describe("buildSalesInventorySyncMonitor", () => {
	test("marks untouched legacy sales as not started", () => {
		const monitor = buildSalesInventorySyncMonitor({
			counts: {
				...emptyCounts,
				totalSalesCount: 10,
				missingSalesCount: 10,
				nextUnsyncedSalesOrderId: 12,
			},
		});

		expect(monitor).toMatchObject({
			status: "not_started",
			syncCoverageRate: 0,
			backfillCursorId: 11,
			skippedAlreadySyncedCount: 0,
		});
	});

	test("marks partial coverage as needing backfill", () => {
		const monitor = buildSalesInventorySyncMonitor({
			counts: {
				...emptyCounts,
				totalSalesCount: 20,
				syncedSalesCount: 15,
				missingSalesCount: 5,
				nextUnsyncedSalesOrderId: 30,
			},
		});

		expect(monitor).toMatchObject({
			status: "needs_backfill",
			syncCoverageRate: 75,
			backfillCursorId: 29,
			skippedAlreadySyncedCount: 15,
		});
	});

	test("marks componentless inventory line items as review risk", () => {
		const monitor = buildSalesInventorySyncMonitor({
			counts: {
				...emptyCounts,
				totalSalesCount: 3,
				syncedSalesCount: 3,
				componentlessLineItemCount: 2,
				componentlessSalesCount: 1,
			},
		});

		expect(monitor).toMatchObject({
			status: "needs_review",
			failedRiskCount: 1,
			backfillCursorId: null,
		});
	});

	test("marks stale inventory sale lines as review risk", () => {
		const monitor = buildSalesInventorySyncMonitor({
			counts: {
				...emptyCounts,
				totalSalesCount: 4,
				syncedSalesCount: 4,
				staleInventoryLineItemCount: 2,
				staleStockAllocationCount: 5,
				staleInboundDemandCount: 3,
			},
			staleSamples: [
				{
					id: 91,
					title: "Detached line",
					saleId: null,
					salesItemId: 801,
					inventoryId: 12,
					inventoryVariantId: 34,
					updatedAt: null,
					sale: null,
				},
			],
		});

		expect(monitor).toMatchObject({
			status: "needs_review",
			failedRiskCount: 2,
			staleStockAllocationCount: 5,
			staleInboundDemandCount: 3,
			reconciliation: null,
			staleSamples: [
				{
					id: 91,
					title: "Detached line",
				},
			],
		});
	});

	test("adds reconciliation drift to review risk when requested", () => {
		const monitor = buildSalesInventorySyncMonitor({
			counts: {
				...emptyCounts,
				totalSalesCount: 4,
				syncedSalesCount: 4,
			},
			reconciliationReport: {
				mode: "dry-run",
				status: "needs_review",
				salesOrderId: null,
				checkedLineCount: 12,
				totalDriftCount: 3,
				skippedComparisonCount: 0,
				nextCursorId: 99,
				hasMore: true,
				domains: {
					sales_inventory_sync: {
						domain: "sales_inventory_sync",
						checkedCount: 12,
						driftCount: 1,
						severity: "error",
						skippedCount: 0,
						skippedReasons: [],
						samples: [
							{
								domain: "sales_inventory_sync",
								severity: "error",
								message: "Inventory line has no component rows.",
							},
						],
					},
					shipment_allocation: {
						domain: "shipment_allocation",
						checkedCount: 10,
						driftCount: 2,
						severity: "error",
						skippedCount: 0,
						skippedReasons: [],
						samples: [
							{
								domain: "shipment_allocation",
								severity: "error",
								message:
									"Completed delivery quantity does not match consumed inventory allocation quantity.",
							},
						],
					},
					component_fulfillment: {
						domain: "component_fulfillment",
						checkedCount: 20,
						driftCount: 0,
						severity: "info",
						skippedCount: 0,
						skippedReasons: [],
						samples: [],
					},
				},
			},
		});

		expect(monitor).toMatchObject({
			status: "needs_review",
			failedRiskCount: 3,
			reconciliation: {
				status: "needs_review",
				checkedLineCount: 12,
				totalDriftCount: 3,
				skippedComparisonCount: 0,
				nextCursorId: 99,
				hasMore: true,
				domainSummaries: [
					{
						domain: "sales_inventory_sync",
						checkedCount: 12,
						driftCount: 1,
						severity: "error",
						skippedCount: 0,
						skippedReasons: [],
						sampleCount: 1,
					},
					{
						domain: "shipment_allocation",
						checkedCount: 10,
						driftCount: 2,
						severity: "error",
						skippedCount: 0,
						skippedReasons: [],
						sampleCount: 1,
					},
					{
						domain: "component_fulfillment",
						checkedCount: 20,
						driftCount: 0,
						severity: "info",
						skippedCount: 0,
						skippedReasons: [],
						sampleCount: 0,
					},
				],
				driftDomains: [
					{
						domain: "sales_inventory_sync",
						driftCount: 1,
						severity: "error",
						sampleCount: 1,
					},
					{
						domain: "shipment_allocation",
						driftCount: 2,
						severity: "error",
						sampleCount: 1,
					},
				],
			},
		});
	});

	test("marks clean bounded reconciliation as partial until the cursor is exhausted", () => {
		const summary = buildSalesInventoryReconciliationSummary({
			mode: "dry-run",
			status: "partial",
			salesOrderId: null,
			checkedLineCount: 50,
			totalDriftCount: 0,
			skippedComparisonCount: 0,
			nextCursorId: 150,
			hasMore: true,
			domains: {
				sales_inventory_sync: {
					domain: "sales_inventory_sync",
					checkedCount: 50,
					driftCount: 0,
					severity: "info",
					skippedCount: 0,
					skippedReasons: [],
					samples: [],
				},
				shipment_allocation: {
					domain: "shipment_allocation",
					checkedCount: 50,
					driftCount: 0,
					severity: "info",
					skippedCount: 0,
					skippedReasons: [],
					samples: [],
				},
				component_fulfillment: {
					domain: "component_fulfillment",
					checkedCount: 100,
					driftCount: 0,
					severity: "info",
					skippedCount: 0,
					skippedReasons: [],
					samples: [],
				},
			},
		});

		expect(summary).toEqual({
			status: "partial",
			checkedLineCount: 50,
			totalDriftCount: 0,
			skippedComparisonCount: 0,
			nextCursorId: 150,
			hasMore: true,
			domainSummaries: [
				{
					domain: "sales_inventory_sync",
					checkedCount: 50,
					driftCount: 0,
					severity: "info",
					skippedCount: 0,
					skippedReasons: [],
					sampleCount: 0,
				},
				{
					domain: "shipment_allocation",
					checkedCount: 50,
					driftCount: 0,
					severity: "info",
					skippedCount: 0,
					skippedReasons: [],
					sampleCount: 0,
				},
				{
					domain: "component_fulfillment",
					checkedCount: 100,
					driftCount: 0,
					severity: "info",
					skippedCount: 0,
					skippedReasons: [],
					sampleCount: 0,
				},
			],
			driftDomains: [],
		});
	});

	test("keeps the monitor in review until bounded reconciliation finishes", () => {
		const monitor = buildSalesInventorySyncMonitor({
			counts: {
				...emptyCounts,
				totalSalesCount: 4,
				syncedSalesCount: 4,
			},
			reconciliationReport: {
				mode: "dry-run",
				status: "partial",
				salesOrderId: null,
				checkedLineCount: 50,
				totalDriftCount: 0,
				skippedComparisonCount: 0,
				nextCursorId: 150,
				hasMore: true,
				domains: {
					sales_inventory_sync: {
						domain: "sales_inventory_sync",
						checkedCount: 50,
						driftCount: 0,
						severity: "info",
						skippedCount: 0,
						skippedReasons: [],
						samples: [],
					},
					shipment_allocation: {
						domain: "shipment_allocation",
						checkedCount: 50,
						driftCount: 0,
						severity: "info",
						skippedCount: 0,
						skippedReasons: [],
						samples: [],
					},
					component_fulfillment: {
						domain: "component_fulfillment",
						checkedCount: 100,
						driftCount: 0,
						severity: "info",
						skippedCount: 0,
						skippedReasons: [],
						samples: [],
					},
				},
			},
		});

		expect(monitor).toMatchObject({
			status: "needs_review",
			failedRiskCount: 0,
			reconciliation: {
				status: "partial",
				checkedLineCount: 50,
				totalDriftCount: 0,
				skippedComparisonCount: 0,
				nextCursorId: 150,
				hasMore: true,
			},
		});
	});

	test("marks skipped reconciliation coverage as review even without drift", () => {
		const summary = buildSalesInventoryReconciliationSummary({
			mode: "dry-run",
			status: "needs_review",
			salesOrderId: null,
			checkedLineCount: 20,
			totalDriftCount: 0,
			skippedComparisonCount: 2,
			nextCursorId: null,
			hasMore: false,
			domains: {
				sales_inventory_sync: {
					domain: "sales_inventory_sync",
					checkedCount: 20,
					driftCount: 0,
					severity: "info",
					skippedCount: 0,
					skippedReasons: [],
					samples: [],
				},
				shipment_allocation: {
					domain: "shipment_allocation",
					checkedCount: 18,
					driftCount: 0,
					severity: "info",
					skippedCount: 2,
					skippedReasons: [
						"Inventory line has no linked legacy sales item to compare with delivery state.",
					],
					samples: [],
				},
				component_fulfillment: {
					domain: "component_fulfillment",
					checkedCount: 20,
					driftCount: 0,
					severity: "info",
					skippedCount: 0,
					skippedReasons: [],
					samples: [],
				},
			},
		});

		expect(summary).toMatchObject({
			status: "needs_review",
			checkedLineCount: 20,
			totalDriftCount: 0,
			skippedComparisonCount: 2,
			hasMore: false,
			domainSummaries: [
				{
					domain: "sales_inventory_sync",
					skippedCount: 0,
				},
				{
					domain: "shipment_allocation",
					driftCount: 0,
					skippedCount: 2,
					skippedReasons: [
						"Inventory line has no linked legacy sales item to compare with delivery state.",
					],
				},
				{
					domain: "component_fulfillment",
					skippedCount: 0,
				},
			],
			driftDomains: [],
		});
	});

	test("adds skipped reconciliation coverage to review risk", () => {
		const monitor = buildSalesInventorySyncMonitor({
			counts: {
				...emptyCounts,
				totalSalesCount: 4,
				syncedSalesCount: 4,
			},
			reconciliationReport: {
				mode: "dry-run",
				status: "needs_review",
				salesOrderId: null,
				checkedLineCount: 20,
				totalDriftCount: 0,
				skippedComparisonCount: 2,
				nextCursorId: null,
				hasMore: false,
				domains: {
					sales_inventory_sync: {
						domain: "sales_inventory_sync",
						checkedCount: 20,
						driftCount: 0,
						severity: "info",
						skippedCount: 0,
						skippedReasons: [],
						samples: [],
					},
					shipment_allocation: {
						domain: "shipment_allocation",
						checkedCount: 18,
						driftCount: 0,
						severity: "info",
						skippedCount: 2,
						skippedReasons: [
							"Inventory line has no linked legacy sales item to compare with delivery state.",
						],
						samples: [],
					},
					component_fulfillment: {
						domain: "component_fulfillment",
						checkedCount: 20,
						driftCount: 0,
						severity: "info",
						skippedCount: 0,
						skippedReasons: [],
						samples: [],
					},
				},
			},
		});

		expect(monitor).toMatchObject({
			status: "needs_review",
			failedRiskCount: 2,
			reconciliation: {
				status: "needs_review",
				totalDriftCount: 0,
				skippedComparisonCount: 2,
			},
		});
	});

	test("dry-runs stale inventory sale-line cleanup without mutations", async () => {
		const calls: string[] = [];
		const db = {
			lineItem: {
				findMany: async () => [
					{
						id: 91,
						components: [{ id: 501 }, { id: 502 }],
					},
				],
				updateMany: async () => {
					calls.push("lineItem.updateMany");
					return { count: 1 };
				},
			},
			stockAllocation: {
				updateMany: async () => {
					calls.push("stockAllocation.updateMany");
					return { count: 2 };
				},
				deleteMany: async () => {
					calls.push("stockAllocation.deleteMany");
					return { count: 2 };
				},
			},
			inboundDemand: {
				updateMany: async () => {
					calls.push("inboundDemand.updateMany");
					return { count: 1 };
				},
				deleteMany: async () => {
					calls.push("inboundDemand.deleteMany");
					return { count: 1 };
				},
			},
			lineItemComponents: {
				deleteMany: async () => {
					calls.push("lineItemComponents.deleteMany");
					return { count: 2 };
				},
			},
		};

		const result = await cleanupStaleSalesInventoryLineItems(db as any, {
			lineItemIds: [91],
			dryRun: true,
		});

		expect(result).toEqual({
			dryRun: true,
			matchedCount: 1,
			cleanedLineItemCount: 0,
			componentCount: 2,
			releasedAllocationCount: 0,
			cancelledInboundDemandCount: 0,
			lineItemIds: [91],
		});
		expect(calls).toEqual([]);
	});

	test("cleans stale inventory sale lines and related demand", async () => {
		const calls: string[] = [];
		const db = {
			lineItem: {
				findMany: async () => [
					{
						id: 91,
						components: [{ id: 501 }, { id: 502 }],
					},
				],
				updateMany: async () => {
					calls.push("lineItem.updateMany");
					return { count: 1 };
				},
			},
			stockAllocation: {
				updateMany: async () => {
					calls.push("stockAllocation.updateMany");
					return { count: 2 };
				},
				deleteMany: async () => {
					calls.push("stockAllocation.deleteMany");
					return { count: 2 };
				},
			},
			inboundDemand: {
				updateMany: async () => {
					calls.push("inboundDemand.updateMany");
					return { count: 1 };
				},
				deleteMany: async () => {
					calls.push("inboundDemand.deleteMany");
					return { count: 1 };
				},
			},
			lineItemComponents: {
				deleteMany: async () => {
					calls.push("lineItemComponents.deleteMany");
					return { count: 2 };
				},
			},
		};

		const result = await cleanupStaleSalesInventoryLineItems(db as any, {
			lineItemIds: [91],
			dryRun: false,
		});

		expect(result).toMatchObject({
			dryRun: false,
			matchedCount: 1,
			cleanedLineItemCount: 1,
			componentCount: 2,
			releasedAllocationCount: 2,
			cancelledInboundDemandCount: 1,
			lineItemIds: [91],
		});
		expect(calls).toEqual([
			"stockAllocation.updateMany",
			"stockAllocation.deleteMany",
			"inboundDemand.updateMany",
			"inboundDemand.deleteMany",
			"lineItemComponents.deleteMany",
			"lineItem.updateMany",
		]);
	});
});
