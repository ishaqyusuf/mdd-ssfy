import { describe, expect, test } from "bun:test";

import { buildSalesInventorySyncMonitor } from "./sales-inventory-sync-monitor";

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
});
