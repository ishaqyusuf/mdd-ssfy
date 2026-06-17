import type { Db } from "@gnd/db";
import {
	getInventoryReconciliationReport,
	type InventoryReconciliationDomain,
	type InventoryReconciliationReport,
	type ReconciliationSeverity,
} from "./inventory-reconciliation-report";

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

export type SalesInventoryStaleLineSample = {
	id: number;
	title: string | null;
	saleId: number | null;
	salesItemId: number | null;
	inventoryId: number;
	inventoryVariantId: number;
	updatedAt: Date | null;
	sale: SalesInventorySyncMonitorSample | null;
};

export type SalesInventorySyncMonitorInput = {
	sampleLimit?: number;
	includeReconciliation?: boolean;
	reconciliationLimit?: number;
};

export type CleanupStaleSalesInventoryLineItemsInput = {
	lineItemIds?: number[];
	limit?: number;
	dryRun?: boolean;
};

export type CleanupStaleSalesInventoryLineItemsResult = {
	dryRun: boolean;
	matchedCount: number;
	cleanedLineItemCount: number;
	componentCount: number;
	releasedAllocationCount: number;
	cancelledInboundDemandCount: number;
	lineItemIds: number[];
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
	staleInventoryLineItemCount: number;
	staleStockAllocationCount: number;
	staleInboundDemandCount: number;
	nextUnsyncedSalesOrderId: number | null;
};

export type SalesInventoryReconciliationSummary = {
	status: "synced" | "needs_review" | "partial";
	checkedLineCount: number;
	totalDriftCount: number;
	skippedComparisonCount: number;
	nextCursorId: number | null;
	hasMore: boolean;
	domainSummaries: Array<{
		domain: InventoryReconciliationDomain;
		checkedCount: number;
		driftCount: number;
		severity: ReconciliationSeverity;
		skippedCount: number;
		skippedReasons: string[];
		sampleCount: number;
	}>;
	driftDomains: Array<{
		domain: InventoryReconciliationDomain;
		driftCount: number;
		severity: ReconciliationSeverity;
		sampleCount: number;
	}>;
};

export type SalesInventorySyncMonitor = SalesInventorySyncMonitorCounts & {
	syncCoverageRate: number;
	backfillCursorId: number | null;
	skippedAlreadySyncedCount: number;
	failedRiskCount: number;
	status: "not_started" | "needs_backfill" | "needs_review" | "synced";
	reconciliation: SalesInventoryReconciliationSummary | null;
	missingSamples: SalesInventorySyncMonitorSample[];
	reviewSamples: SalesInventorySyncMonitorSample[];
	staleSamples: SalesInventoryStaleLineSample[];
};

export function buildSalesInventorySyncMonitor(input: {
	counts: SalesInventorySyncMonitorCounts;
	missingSamples?: SalesInventorySyncMonitorSample[];
	reviewSamples?: SalesInventorySyncMonitorSample[];
	staleSamples?: SalesInventoryStaleLineSample[];
	reconciliationReport?: InventoryReconciliationReport | null;
}): SalesInventorySyncMonitor {
	const { counts } = input;
	const reconciliation = buildSalesInventoryReconciliationSummary(
		input.reconciliationReport,
	);
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
		counts.componentlessSalesCount +
		counts.staleInventoryLineItemCount +
		(reconciliation?.totalDriftCount || 0) +
		(reconciliation?.skippedComparisonCount || 0);

	let status: SalesInventorySyncMonitor["status"] = "synced";
	if (counts.totalSalesCount > 0 && counts.syncedSalesCount === 0) {
		status = "not_started";
	} else if (counts.missingSalesCount > 0) {
		status = "needs_backfill";
	} else if (failedRiskCount > 0 || reconciliation?.status === "partial") {
		status = "needs_review";
	}

	return {
		...counts,
		syncCoverageRate,
		backfillCursorId,
		skippedAlreadySyncedCount: counts.syncedSalesCount,
		failedRiskCount,
		status,
		reconciliation,
		missingSamples: input.missingSamples || [],
		reviewSamples: input.reviewSamples || [],
		staleSamples: input.staleSamples || [],
	};
}

export function buildSalesInventoryReconciliationSummary(
	report?: InventoryReconciliationReport | null,
): SalesInventoryReconciliationSummary | null {
	if (!report) return null;

	const domainSummaries = Object.values(report.domains).map((domain) => ({
		domain: domain.domain,
		checkedCount: domain.checkedCount,
		driftCount: domain.driftCount,
		severity: domain.severity,
		skippedCount: domain.skippedCount,
		skippedReasons: domain.skippedReasons,
		sampleCount: domain.samples.length,
	}));
	const skippedComparisonCount = report.skippedComparisonCount;

	return {
		status: report.status,
		checkedLineCount: report.checkedLineCount,
		totalDriftCount: report.totalDriftCount,
		skippedComparisonCount,
		nextCursorId: report.nextCursorId,
		hasMore: report.hasMore,
		domainSummaries,
		driftDomains: Object.values(report.domains)
			.filter((domain) => domain.driftCount > 0)
			.map((domain) => ({
				domain: domain.domain,
				driftCount: domain.driftCount,
				severity: domain.severity,
				sampleCount: domain.samples.length,
			})),
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
	const staleLineItemWhere = staleInventoryLineItemWhere();
	const staleComponentResidueWhere = {
		deletedAt: null,
		lineItemComponent: {
			is: {
				parent: {
					is: staleLineItemWhere,
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
		staleInventoryLineItemCount,
		staleStockAllocationCount,
		staleInboundDemandCount,
		nextUnsyncedSale,
		missingSamples,
		reviewSamples,
		staleSamples,
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
		db.lineItem.count({ where: staleLineItemWhere }),
		db.stockAllocation.count({ where: staleComponentResidueWhere }),
		db.inboundDemand.count({ where: staleComponentResidueWhere }),
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
		db.lineItem.findMany({
			where: staleLineItemWhere,
			orderBy: {
				updatedAt: "desc",
			},
			take: sampleLimit,
			select: {
				id: true,
				title: true,
				saleId: true,
				salesItemId: true,
				inventoryId: true,
				inventoryVariantId: true,
				updatedAt: true,
				sale: {
					select: salesSampleSelect,
				},
			},
		}),
	]);
	const reconciliationReport = input.includeReconciliation
		? await getInventoryReconciliationReport(db, {
				limit: Math.min(Math.max(input.reconciliationLimit ?? 50, 1), 200),
				sampleLimit,
			})
		: null;

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
			staleInventoryLineItemCount,
			staleStockAllocationCount,
			staleInboundDemandCount,
			nextUnsyncedSalesOrderId: nextUnsyncedSale?.id ?? null,
		},
		missingSamples,
		reviewSamples,
		staleSamples,
		reconciliationReport,
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

function staleInventoryLineItemWhere(input?: { lineItemIds?: number[] }) {
	const lineItemIds = input?.lineItemIds?.filter(
		(id) => Number.isInteger(id) && id > 0,
	);

	return {
		deletedAt: null,
		lineItemType: SALE_LINE_ITEM_TYPE,
		...(lineItemIds?.length
			? {
					id: {
						in: lineItemIds,
					},
				}
			: {}),
		OR: [
			{
				saleId: null,
			},
			{
				sale: {
					is: {
						deletedAt: {
							not: null,
						},
					},
				},
			},
		],
	};
}

export async function cleanupStaleSalesInventoryLineItems(
	db: Db,
	input: CleanupStaleSalesInventoryLineItemsInput = {},
): Promise<CleanupStaleSalesInventoryLineItemsResult> {
	const limit = Math.min(Math.max(input.limit ?? 50, 1), 500);
	const dryRun = input.dryRun ?? true;
	const staleLineItems = await db.lineItem.findMany({
		where: staleInventoryLineItemWhere({
			lineItemIds: input.lineItemIds,
		}),
		orderBy: {
			updatedAt: "desc",
		},
		take: limit,
		select: {
			id: true,
			components: {
				select: {
					id: true,
				},
			},
		},
	});
	const lineItemIds = staleLineItems.map((lineItem) => lineItem.id);
	const componentIds = staleLineItems.flatMap((lineItem) =>
		lineItem.components.map((component) => component.id),
	);

	if (dryRun || lineItemIds.length === 0) {
		return {
			dryRun,
			matchedCount: staleLineItems.length,
			cleanedLineItemCount: 0,
			componentCount: componentIds.length,
			releasedAllocationCount: 0,
			cancelledInboundDemandCount: 0,
			lineItemIds,
		};
	}

	const now = new Date();
	let releasedAllocationCount = 0;
	let cancelledInboundDemandCount = 0;

	if (componentIds.length) {
		const releasedAllocations = await db.stockAllocation.updateMany({
			where: {
				lineItemComponentId: {
					in: componentIds,
				},
			},
			data: {
				deletedAt: now,
				status: "released",
			},
		});
		releasedAllocationCount = releasedAllocations.count;

		await db.stockAllocation.deleteMany({
			where: {
				lineItemComponentId: {
					in: componentIds,
				},
			},
		});

		const cancelledInboundDemands = await db.inboundDemand.updateMany({
			where: {
				lineItemComponentId: {
					in: componentIds,
				},
			},
			data: {
				deletedAt: now,
				status: "cancelled",
			},
		});
		cancelledInboundDemandCount = cancelledInboundDemands.count;

		await db.inboundDemand.deleteMany({
			where: {
				lineItemComponentId: {
					in: componentIds,
				},
			},
		});

		await db.lineItemComponents.deleteMany({
			where: {
				id: {
					in: componentIds,
				},
			},
		});
	}

	const cleanedLineItems = await db.lineItem.updateMany({
		where: {
			id: {
				in: lineItemIds,
			},
		},
		data: {
			deletedAt: now,
		},
	});

	return {
		dryRun,
		matchedCount: staleLineItems.length,
		cleanedLineItemCount: cleanedLineItems.count,
		componentCount: componentIds.length,
		releasedAllocationCount,
		cancelledInboundDemandCount,
		lineItemIds,
	};
}
