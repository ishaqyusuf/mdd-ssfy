import type { Db } from "@gnd/db";

const SALE_LINE_ITEM_TYPE = "SALE" as const;

export type SalesInventorySyncMonitorSample = {
	id: number;
	orderId: string;
	status: string | null;
	inventoryStatus: string | null;
	prodStatus: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
};

export type SalesInventorySyncMonitorInput = {
	sampleLimit?: number;
};

export type SalesInventorySyncMonitorCounts = {
	totalSalesCount: number;
	syncedSalesCount: number;
	missingSalesCount: number;
	inventoryLineItemCount: number;
	componentCount: number;
	requiredComponentCount: number;
	componentlessLineItemCount: number;
	componentlessSalesCount: number;
	pendingReviewComponentCount: number;
	awaitingInboundComponentCount: number;
	allocatedComponentCount: number;
	fulfilledComponentCount: number;
	nextUnsyncedSalesOrderId: number | null;
};

export type SalesInventorySyncMonitor = SalesInventorySyncMonitorCounts & {
	syncCoverageRate: number;
	backfillCursorId: number | null;
	skippedAlreadySyncedCount: number;
	failedRiskCount: number;
	status: "not_started" | "needs_backfill" | "needs_review" | "synced";
	missingSamples: SalesInventorySyncMonitorSample[];
	reviewSamples: SalesInventorySyncMonitorSample[];
};

export function buildSalesInventorySyncMonitor(input: {
	counts: SalesInventorySyncMonitorCounts;
	missingSamples?: SalesInventorySyncMonitorSample[];
	reviewSamples?: SalesInventorySyncMonitorSample[];
}): SalesInventorySyncMonitor {
	const { counts } = input;
	const syncCoverageRate =
		counts.totalSalesCount > 0
			? Math.round(
					(counts.syncedSalesCount / counts.totalSalesCount) * 10000,
				) / 100
			: 100;
	const backfillCursorId = counts.nextUnsyncedSalesOrderId
		? Math.max(0, counts.nextUnsyncedSalesOrderId - 1)
		: null;
	const failedRiskCount =
		counts.componentlessSalesCount;

	let status: SalesInventorySyncMonitor["status"] = "synced";
	if (counts.totalSalesCount > 0 && counts.syncedSalesCount === 0) {
		status = "not_started";
	} else if (counts.missingSalesCount > 0) {
		status = "needs_backfill";
	} else if (failedRiskCount > 0) {
		status = "needs_review";
	}

	return {
		...counts,
		syncCoverageRate,
		backfillCursorId,
		skippedAlreadySyncedCount: counts.syncedSalesCount,
		failedRiskCount,
		status,
		missingSamples: input.missingSamples || [],
		reviewSamples: input.reviewSamples || [],
	};
}

export async function getSalesInventorySyncMonitor(
	db: Db,
	input: SalesInventorySyncMonitorInput = {},
): Promise<SalesInventorySyncMonitor> {
	const sampleLimit = Math.min(Math.max(input.sampleLimit ?? 5, 1), 20);
	const salesWhere = {
		deletedAt: null,
	};
	const inventoryLineItemWhere = {
		deletedAt: null,
		lineItemType: SALE_LINE_ITEM_TYPE,
		sale: {
			is: {
				deletedAt: null,
			},
		},
	};
	const componentWhere = {
		parent: inventoryLineItemWhere,
	};
	const missingSalesWhere = {
		...salesWhere,
		lineItems: {
			none: {
				deletedAt: null,
				lineItemType: SALE_LINE_ITEM_TYPE,
			},
		},
	};
	const componentlessLineItemWhere = {
		...inventoryLineItemWhere,
		components: {
			none: {},
		},
	};
	const componentlessSalesWhere = {
		...salesWhere,
		lineItems: {
			some: {
				deletedAt: null,
				lineItemType: SALE_LINE_ITEM_TYPE,
				components: {
					none: {},
				},
			},
		},
	};

	const [
		totalSalesCount,
		syncedSalesCount,
		missingSalesCount,
		inventoryLineItemCount,
		componentCount,
		requiredComponentCount,
		componentlessLineItemCount,
		componentlessSalesCount,
		pendingReviewComponentCount,
		awaitingInboundComponentCount,
		allocatedComponentCount,
		fulfilledComponentCount,
		nextUnsyncedSale,
		missingSamples,
		reviewSamples,
	] = await Promise.all([
		db.salesOrders.count({ where: salesWhere }),
		db.salesOrders.count({
			where: {
				...salesWhere,
				lineItems: {
					some: {
						deletedAt: null,
						lineItemType: SALE_LINE_ITEM_TYPE,
					},
				},
			},
		}),
		db.salesOrders.count({ where: missingSalesWhere }),
		db.lineItem.count({ where: inventoryLineItemWhere }),
		db.lineItemComponents.count({ where: componentWhere }),
		db.lineItemComponents.count({
			where: {
				...componentWhere,
				required: true,
			},
		}),
		db.lineItem.count({ where: componentlessLineItemWhere }),
		db.salesOrders.count({ where: componentlessSalesWhere }),
		db.lineItemComponents.count({
			where: {
				...componentWhere,
				status: {
					in: ["pending", "partially_allocated"],
				},
			},
		}),
		db.lineItemComponents.count({
			where: {
				...componentWhere,
				status: {
					in: ["inbound_required", "partially_received"],
				},
			},
		}),
		db.lineItemComponents.count({
			where: {
				...componentWhere,
				status: "allocated",
			},
		}),
		db.lineItemComponents.count({
			where: {
				...componentWhere,
				status: "fulfilled",
			},
		}),
		db.salesOrders.findFirst({
			where: missingSalesWhere,
			orderBy: {
				id: "asc",
			},
			select: {
				id: true,
			},
		}),
		db.salesOrders.findMany({
			where: missingSalesWhere,
			orderBy: {
				id: "asc",
			},
			take: sampleLimit,
			select: salesSampleSelect,
		}),
		db.salesOrders.findMany({
			where: componentlessSalesWhere,
			orderBy: {
				updatedAt: "desc",
			},
			take: sampleLimit,
			select: salesSampleSelect,
		}),
	]);

	return buildSalesInventorySyncMonitor({
		counts: {
			totalSalesCount,
			syncedSalesCount,
			missingSalesCount,
			inventoryLineItemCount,
			componentCount,
			requiredComponentCount,
			componentlessLineItemCount,
			componentlessSalesCount,
			pendingReviewComponentCount,
			awaitingInboundComponentCount,
			allocatedComponentCount,
			fulfilledComponentCount,
			nextUnsyncedSalesOrderId: nextUnsyncedSale?.id ?? null,
		},
		missingSamples,
		reviewSamples,
	});
}

const salesSampleSelect = {
	id: true,
	orderId: true,
	status: true,
	inventoryStatus: true,
	prodStatus: true,
	createdAt: true,
	updatedAt: true,
} as const;
