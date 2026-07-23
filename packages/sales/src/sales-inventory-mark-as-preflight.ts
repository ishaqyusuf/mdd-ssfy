import type { Db, TransactionClient } from "@gnd/db";
import { createInboundShipmentFromDemands } from "@gnd/inventory";

import { getSalesOrderLifecycleStatusInfo } from "./order-status";
import type { SalesInventoryOverviewReadiness } from "./sales-inventory-overview";
import { resolveSalesInventoryFulfillmentStatus } from "./sales-inventory-policy";

type DbLike = Db | TransactionClient;

export type SalesInventoryMarkAsAction = "production_completed" | "fulfilled";

export type SalesInventoryMarkAsBlockReason =
	| "awaiting_inbound"
	| "needs_allocation";

export type SalesInventoryMarkAsPreflightComponent = {
	componentId: number | null;
	lineItemId: number | null;
	name: string | null;
	sku: string | null;
	status: string | null;
	qtyRequired: number;
	qtyAllocated: number;
	qtyReceived: number;
	openInboundQty: number;
	pendingQty: number;
	reason: SalesInventoryMarkAsBlockReason;
	canResolveAvailability: boolean;
	resolvableDemandIds: number[];
	pendingStockAllocationIds: number[];
	pendingStockAllocationQty: number;
	autoInboundDemandIds: number[];
	autoInboundQty: number;
	autoInboundSupplierId: number | null;
	autoInboundSupplierName: string | null;
	inventoryVariantId: number | null;
};

export type SalesInventoryMarkAsPreflightBlocker = {
	salesOrderId: number;
	orderId: string | null;
	title: string | null;
	readiness: SalesInventoryOverviewReadiness;
	reason: SalesInventoryMarkAsBlockReason;
	requiredComponentCount: number;
	unresolvedComponentCount: number;
	pendingQty: number;
	openInboundQty: number;
	resolvableDemandIds: number[];
	pendingStockAllocationIds: number[];
	autoInboundDemandIds: number[];
	autoInboundSelections: Array<{
		lineItemComponentIds: number[];
		qty: number;
		supplierId: number | null;
		supplierName: string | null;
	}>;
	unresolvableComponentCount: number;
	components: SalesInventoryMarkAsPreflightComponent[];
};

export type SalesInventoryMarkAsPreflightResult = {
	ok: boolean;
	action: SalesInventoryMarkAsAction;
	saleCount: number;
	configuredSaleCount: number;
	unconfiguredSaleCount: number;
	blockedSaleCount: number;
	totals: {
		pendingQty: number;
		openInboundQty: number;
		unresolvedComponentCount: number;
		resolvableDemandCount: number;
		unresolvableComponentCount: number;
		pendingStockAllocationCount: number;
		pendingStockAllocationQty: number;
		autoInboundDemandCount: number;
		autoInboundQty: number;
	};
	canResolveAndContinue: boolean;
	blockers: SalesInventoryMarkAsPreflightBlocker[];
};

type DemandLike = {
	id?: number | null;
	qty?: number | null;
	qtyReceived?: number | null;
	status?: string | null;
	inboundShipmentItemId?: number | null;
};

type StockAllocationLike = {
	id?: number | null;
	qty?: number | null;
	status?: string | null;
};

type ComponentLike = {
	id?: number | null;
	required?: boolean | null;
	qty?: number | null;
	qtyAllocated?: number | null;
	qtyInbound?: number | null;
	qtyReceived?: number | null;
	status?: string | null;
	inventory?: {
		name?: string | null;
		defaultSupplier?: {
			id?: number | null;
			name?: string | null;
		} | null;
	} | null;
	inventoryVariant?: {
		id?: number | null;
		sku?: string | null;
		uid?: string | null;
		supplierVariants?: Array<{
			supplierId?: number | null;
			active?: boolean | null;
			preferred?: boolean | null;
			supplier?: {
				id?: number | null;
				name?: string | null;
			} | null;
		}> | null;
	} | null;
	inboundDemands?: DemandLike[] | null;
	stockAllocations?: StockAllocationLike[] | null;
};

type LineItemLike = {
	id?: number | null;
	components?: ComponentLike[] | null;
};

export type SalesInventoryMarkAsPreflightSaleLike = {
	id: number;
	orderId?: string | null;
	title?: string | null;
	lineItems?: LineItemLike[] | null;
};

const ACTIVE_INBOUND_DEMAND_STATUSES = new Set([
	"pending",
	"ordered",
	"partially_received",
]);
const MUTABLE_INBOUND_DEMAND_STATUSES = new Set(["pending", "ordered"]);
const INBOUND_COMPONENT_STATUSES = new Set([
	"inbound_required",
	"partially_received",
]);
const REVIEW_COMPONENT_STATUSES = new Set(["pending", "partially_allocated"]);
const READY_COMPONENT_STATUSES = new Set(["allocated", "fulfilled"]);
const AUTO_INBOUND_SUPPLIER_UID = "auto-created-inbound";
const AUTO_INBOUND_SUPPLIER_NAME = "Auto-created inbound";

function positiveNumber(value?: number | null) {
	return Math.max(0, Number(value || 0));
}

function openDemandQty(demand: DemandLike) {
	if (!ACTIVE_INBOUND_DEMAND_STATUSES.has(String(demand.status || ""))) {
		return 0;
	}

	return Math.max(
		0,
		positiveNumber(demand.qty) - positiveNumber(demand.qtyReceived),
	);
}

function isResolvableDemand(demand: DemandLike) {
	return (
		Number(demand.id || 0) > 0 &&
		MUTABLE_INBOUND_DEMAND_STATUSES.has(String(demand.status || "")) &&
		!demand.inboundShipmentItemId &&
		positiveNumber(demand.qtyReceived) <= 0 &&
		openDemandQty(demand) > 0
	);
}

function componentDisplayName(component: ComponentLike) {
	return component.inventory?.name || component.inventoryVariant?.sku || null;
}

function componentSku(component: ComponentLike) {
	return (
		component.inventoryVariant?.sku || component.inventoryVariant?.uid || null
	);
}

function uniquePositiveNumbers(values: Array<number | null | undefined>) {
	return Array.from(
		new Set(values.map((value) => Number(value || 0)).filter((id) => id > 0)),
	);
}

function getPreferredSupplier(component: ComponentLike) {
	const supplierVariant =
		(component.inventoryVariant?.supplierVariants || []).find(
			(variant) => variant.active !== false && variant.preferred,
		) ||
		(component.inventoryVariant?.supplierVariants || []).find(
			(variant) => variant.active !== false,
		) ||
		(component.inventoryVariant?.supplierVariants || [])[0] ||
		null;
	const supplierId =
		supplierVariant?.supplierId ?? supplierVariant?.supplier?.id ?? null;

	if (supplierId) {
		return {
			id: supplierId,
			name: supplierVariant?.supplier?.name || "Preferred supplier",
		};
	}

	const defaultSupplier = component.inventory?.defaultSupplier;
	if (defaultSupplier?.id) {
		return {
			id: defaultSupplier.id,
			name: defaultSupplier.name || "Default supplier",
		};
	}

	return {
		id: null,
		name: null,
	};
}

export function buildSalesInventoryMarkAsPreflight(input: {
	action: SalesInventoryMarkAsAction;
	sales: SalesInventoryMarkAsPreflightSaleLike[];
}): SalesInventoryMarkAsPreflightResult {
	let configuredSaleCount = 0;
	let unconfiguredSaleCount = 0;
	let totalPendingQty = 0;
	let totalOpenInboundQty = 0;
	let totalUnresolvedComponentCount = 0;
	let totalResolvableDemandCount = 0;
	let totalUnresolvableComponentCount = 0;
	let totalPendingStockAllocationCount = 0;
	let totalPendingStockAllocationQty = 0;
	let totalAutoInboundDemandCount = 0;
	let totalAutoInboundQty = 0;
	const blockers: SalesInventoryMarkAsPreflightBlocker[] = [];

	for (const sale of input.sales) {
		let requiredComponentCount = 0;
		let unresolvedComponentCount = 0;
		let pendingQty = 0;
		let openInboundQtyTotal = 0;
		let hasAwaitingInbound = false;
		let hasAllocationReview = false;
		let allFulfilled = true;
		let allReady = true;
		let unresolvableComponentCount = 0;
		const blockerResolvableDemandIds = new Set<number>();
		const blockerPendingStockAllocationIds = new Set<number>();
		const blockerAutoInboundDemandIds = new Set<number>();
		const autoInboundSelectionsByKey = new Map<
			string,
			{
				lineItemComponentIds: number[];
				qty: number;
				supplierId: number | null;
				supplierName: string | null;
			}
		>();
		const componentBlockers: SalesInventoryMarkAsPreflightComponent[] = [];

		for (const lineItem of sale.lineItems || []) {
			for (const component of lineItem.components || []) {
				if (!component.required) continue;

				requiredComponentCount += 1;
				const status = String(component.status || "pending");
				const qtyRequired = positiveNumber(component.qty);
				const qtyAllocated = positiveNumber(component.qtyAllocated);
				const qtyReceived = positiveNumber(component.qtyReceived);
				const openInboundQty = (component.inboundDemands || []).reduce(
					(sum, demand) => sum + openDemandQty(demand),
					0,
				);
				const resolvableDemands = (component.inboundDemands || []).filter(
					isResolvableDemand,
				);
				const unlinkedAutoInboundDemands = (
					component.inboundDemands || []
				).filter(
					(demand) =>
						ACTIVE_INBOUND_DEMAND_STATUSES.has(String(demand.status || "")) &&
						!demand.inboundShipmentItemId &&
						openDemandQty(demand) > 0,
				);
				const unlinkedAutoInboundDemandQty = unlinkedAutoInboundDemands.reduce(
					(sum, demand) => sum + openDemandQty(demand),
					0,
				);
				const resolvableDemandQty = resolvableDemands.reduce(
					(sum, demand) => sum + openDemandQty(demand),
					0,
				);
				const pendingStockAllocations = (
					component.stockAllocations || []
				).filter(
					(allocation) =>
						String(allocation.status || "") === "pending_review" &&
						positiveNumber(allocation.qty) > 0 &&
						Number(allocation.id || 0) > 0,
				);
				const pendingStockAllocationIds = uniquePositiveNumbers(
					pendingStockAllocations.map((allocation) => allocation.id ?? null),
				);
				const pendingStockAllocationQty = pendingStockAllocations.reduce(
					(sum, allocation) => sum + positiveNumber(allocation.qty),
					0,
				);
				const inboundBacklog =
					openInboundQty ||
					Math.max(
						0,
						positiveNumber(component.qtyInbound) -
							positiveNumber(component.qtyReceived),
					);
				const coveredQty = qtyAllocated + qtyReceived;
				const uncoveredQty = Math.max(0, qtyRequired - coveredQty);
				const statusReady = READY_COMPONENT_STATUSES.has(status);
				const awaitingInbound =
					INBOUND_COMPONENT_STATUSES.has(status) || inboundBacklog > 0;
				const needsAllocation =
					!awaitingInbound &&
					(REVIEW_COMPONENT_STATUSES.has(status) ||
						(!statusReady && uncoveredQty > 0));
				const canResolveAvailability =
					awaitingInbound &&
					inboundBacklog > 0 &&
					positiveNumber(component.qtyReceived) <= 0 &&
					status !== "partially_received" &&
					resolvableDemandQty >= inboundBacklog &&
					coveredQty >= qtyRequired;

				hasAwaitingInbound = hasAwaitingInbound || awaitingInbound;
				hasAllocationReview = hasAllocationReview || needsAllocation;
				allFulfilled = allFulfilled && status === "fulfilled";
				allReady = allReady && (statusReady || coveredQty >= qtyRequired);

				if (!awaitingInbound && !needsAllocation) continue;

				const reason: SalesInventoryMarkAsBlockReason = awaitingInbound
					? "awaiting_inbound"
					: "needs_allocation";
				const componentPendingQty = awaitingInbound
					? Math.max(uncoveredQty, inboundBacklog)
					: uncoveredQty;
				const supplier = getPreferredSupplier(component);
				const autoInboundQty =
					Number(component.id || 0) > 0 &&
					Number(component.inventoryVariant?.id || 0) > 0
						? Math.max(
								0,
								componentPendingQty -
									pendingStockAllocationQty -
									unlinkedAutoInboundDemandQty,
							)
						: 0;

				unresolvedComponentCount += 1;
				pendingQty += componentPendingQty;
				openInboundQtyTotal += inboundBacklog;
				for (const allocationId of pendingStockAllocationIds) {
					blockerPendingStockAllocationIds.add(allocationId);
				}
				for (const demand of unlinkedAutoInboundDemands) {
					if (demand.id) blockerAutoInboundDemandIds.add(Number(demand.id));
				}
				if (autoInboundQty > 0 && component.id) {
					const supplierKey = String(supplier.id ?? "fallback");
					const existing =
						autoInboundSelectionsByKey.get(supplierKey) ||
						({
							lineItemComponentIds: [],
							qty: 0,
							supplierId: supplier.id,
							supplierName: supplier.name,
						} satisfies {
							lineItemComponentIds: number[];
							qty: number;
							supplierId: number | null;
							supplierName: string | null;
						});
					existing.lineItemComponentIds.push(component.id);
					existing.qty += autoInboundQty;
					autoInboundSelectionsByKey.set(supplierKey, existing);
				}
				if (canResolveAvailability) {
					for (const demand of resolvableDemands) {
						if (demand.id) blockerResolvableDemandIds.add(demand.id);
					}
				} else {
					unresolvableComponentCount += 1;
				}
				if (componentBlockers.length < 4) {
					componentBlockers.push({
						componentId: component.id ?? null,
						lineItemId: lineItem.id ?? null,
						name: componentDisplayName(component),
						sku: componentSku(component),
						status,
						qtyRequired,
						qtyAllocated,
						qtyReceived,
						openInboundQty: inboundBacklog,
						pendingQty: componentPendingQty,
						reason,
						canResolveAvailability,
						resolvableDemandIds: canResolveAvailability
							? resolvableDemands
									.map((demand) => Number(demand.id || 0))
									.filter((id) => id > 0)
							: [],
						pendingStockAllocationIds,
						pendingStockAllocationQty,
						autoInboundDemandIds: uniquePositiveNumbers(
							unlinkedAutoInboundDemands.map((demand) => demand.id ?? null),
						),
						autoInboundQty,
						autoInboundSupplierId: supplier.id,
						autoInboundSupplierName: supplier.name,
						inventoryVariantId: component.inventoryVariant?.id ?? null,
					});
				}
			}
		}

		if (!requiredComponentCount) {
			unconfiguredSaleCount += 1;
			continue;
		}

		configuredSaleCount += 1;
		if (!unresolvedComponentCount) continue;

		const readiness: SalesInventoryOverviewReadiness = hasAwaitingInbound
			? "awaiting_inbound"
			: hasAllocationReview
				? "allocation_review"
				: allFulfilled
					? "fulfilled"
					: allReady
						? "ready_for_production"
						: "allocation_review";
		const reason: SalesInventoryMarkAsBlockReason = hasAwaitingInbound
			? "awaiting_inbound"
			: "needs_allocation";

		totalPendingQty += pendingQty;
		totalOpenInboundQty += openInboundQtyTotal;
		totalUnresolvedComponentCount += unresolvedComponentCount;
		totalResolvableDemandCount += blockerResolvableDemandIds.size;
		totalUnresolvableComponentCount += unresolvableComponentCount;
		totalPendingStockAllocationCount += blockerPendingStockAllocationIds.size;
		totalPendingStockAllocationQty += Array.from(componentBlockers).reduce(
			(sum, component) => sum + component.pendingStockAllocationQty,
			0,
		);
		totalAutoInboundDemandCount += blockerAutoInboundDemandIds.size;
		totalAutoInboundQty += Array.from(
			autoInboundSelectionsByKey.values(),
		).reduce((sum, selection) => sum + selection.qty, 0);
		blockers.push({
			salesOrderId: sale.id,
			orderId: sale.orderId ?? null,
			title: sale.title ?? null,
			readiness,
			reason,
			requiredComponentCount,
			unresolvedComponentCount,
			pendingQty,
			openInboundQty: openInboundQtyTotal,
			resolvableDemandIds: Array.from(blockerResolvableDemandIds),
			pendingStockAllocationIds: Array.from(blockerPendingStockAllocationIds),
			autoInboundDemandIds: Array.from(blockerAutoInboundDemandIds),
			autoInboundSelections: Array.from(
				autoInboundSelectionsByKey.values(),
			).map((selection) => ({
				...selection,
				lineItemComponentIds: uniquePositiveNumbers(
					selection.lineItemComponentIds,
				),
			})),
			unresolvableComponentCount,
			components: componentBlockers,
		});
	}

	const canResolveAndContinue =
		blockers.length > 0 &&
		totalUnresolvableComponentCount <= 0 &&
		totalResolvableDemandCount > 0;

	return {
		ok: blockers.length === 0,
		action: input.action,
		saleCount: input.sales.length,
		configuredSaleCount,
		unconfiguredSaleCount,
		blockedSaleCount: blockers.length,
		totals: {
			pendingQty: totalPendingQty,
			openInboundQty: totalOpenInboundQty,
			unresolvedComponentCount: totalUnresolvedComponentCount,
			resolvableDemandCount: totalResolvableDemandCount,
			unresolvableComponentCount: totalUnresolvableComponentCount,
			pendingStockAllocationCount: totalPendingStockAllocationCount,
			pendingStockAllocationQty: totalPendingStockAllocationQty,
			autoInboundDemandCount: totalAutoInboundDemandCount,
			autoInboundQty: totalAutoInboundQty,
		},
		canResolveAndContinue,
		blockers,
	};
}

export async function getSalesInventoryMarkAsPreflight(
	db: DbLike,
	input: {
		salesOrderIds: number[];
		action: SalesInventoryMarkAsAction;
	},
) {
	const salesOrderIds = Array.from(new Set(input.salesOrderIds)).filter(
		(id) => Number.isInteger(id) && id > 0,
	);
	if (!salesOrderIds.length) {
		return buildSalesInventoryMarkAsPreflight({
			action: input.action,
			sales: [],
		});
	}

	const sales = await db.salesOrders.findMany({
		where: {
			id: {
				in: salesOrderIds,
			},
			deletedAt: null,
			type: "order",
		},
		orderBy: {
			id: "asc",
		},
		select: {
			id: true,
			orderId: true,
			title: true,
			lineItems: {
				where: {
					deletedAt: null,
					lineItemType: "SALE",
				},
				select: {
					id: true,
					components: {
						where: {
							status: {
								not: "cancelled",
							},
						},
						select: {
							id: true,
							required: true,
							qty: true,
							qtyAllocated: true,
							qtyInbound: true,
							qtyReceived: true,
							status: true,
							inventory: {
								select: {
									name: true,
									defaultSupplier: {
										select: {
											id: true,
											name: true,
										},
									},
								},
							},
							inventoryVariant: {
								select: {
									id: true,
									sku: true,
									uid: true,
									supplierVariants: {
										select: {
											supplierId: true,
											active: true,
											preferred: true,
											supplier: {
												select: {
													id: true,
													name: true,
												},
											},
										},
										orderBy: [{ preferred: "desc" }, { id: "asc" }],
									},
								},
							},
							stockAllocations: {
								where: {
									deletedAt: null,
									status: "pending_review",
								},
								select: {
									id: true,
									qty: true,
									status: true,
								},
							},
							inboundDemands: {
								where: {
									deletedAt: null,
									status: {
										not: "cancelled",
									},
								},
								select: {
									id: true,
									qty: true,
									qtyReceived: true,
									status: true,
									inboundShipmentItemId: true,
								},
							},
						},
					},
				},
			},
		},
	});

	return buildSalesInventoryMarkAsPreflight({
		action: input.action,
		sales,
	});
}

type ComponentDemandStateStatus =
	| "pending"
	| "allocated"
	| "partially_allocated"
	| "inbound_required"
	| "partially_received"
	| "fulfilled"
	| "cancelled";

export type ResolveSalesInventoryMarkAsAvailabilityResult = {
	action: SalesInventoryMarkAsAction;
	continueAllowed: boolean;
	cancelledDemandCount: number;
	recomputedComponentCount: number;
	updatedSalesOrderCount: number;
	auditHistoryCount: number;
	preflight: SalesInventoryMarkAsPreflightResult;
	remainingPreflight: SalesInventoryMarkAsPreflightResult;
};

export type ResolveSalesInventoryMarkAsAutoResult = {
	action: SalesInventoryMarkAsAction;
	continueAllowed: boolean;
	approvedAllocationCount: number;
	skippedAllocationCount: number;
	createdDemandCount: number;
	createdInboundShipmentCount: number;
	createdInboundItemCount: number;
	linkedDemandCount: number;
	updatedSalesOrderCount: number;
	auditHistoryCount: number;
	skippedComponentCount: number;
	preflight: SalesInventoryMarkAsPreflightResult;
	remainingPreflight: SalesInventoryMarkAsPreflightResult;
};

function computeComponentDemandState(input: {
	qtyRequired: number;
	qtyAllocated: number;
	qtyInbound: number;
	qtyReceived: number;
}): {
	qtyAllocated: number;
	qtyInbound: number;
	qtyReceived: number;
	status: ComponentDemandStateStatus;
} {
	const qtyRequired = positiveNumber(input.qtyRequired);
	const qtyAllocated = positiveNumber(input.qtyAllocated);
	const qtyInbound = positiveNumber(input.qtyInbound);
	const qtyReceived = positiveNumber(input.qtyReceived);

	let status: ComponentDemandStateStatus = "pending";
	if (qtyRequired <= 0) {
		status = "cancelled";
	} else if (qtyReceived >= qtyInbound && qtyInbound > 0) {
		status =
			qtyAllocated + qtyReceived >= qtyRequired
				? "fulfilled"
				: "partially_received";
	} else if (qtyReceived > 0) {
		status = "partially_received";
	} else if (qtyAllocated >= qtyRequired && qtyInbound <= 0) {
		status = "allocated";
	} else if (qtyAllocated > 0 && qtyInbound > 0) {
		status = "partially_allocated";
	} else if (qtyInbound > 0) {
		status = "inbound_required";
	}

	return {
		qtyAllocated,
		qtyInbound,
		qtyReceived,
		status,
	};
}

export async function recomputeLineItemComponentDemandState(
	db: DbLike,
	lineItemComponentId: number,
) {
	const component = await db.lineItemComponents.findFirst({
		where: {
			id: lineItemComponentId,
		},
		select: {
			id: true,
			qty: true,
			stockAllocations: {
				where: {
					deletedAt: null,
					status: {
						in: ["approved", "reserved", "picked", "consumed"],
					},
				},
				select: {
					qty: true,
				},
			},
			inboundDemands: {
				where: {
					deletedAt: null,
					status: {
						not: "cancelled",
					},
				},
				select: {
					qty: true,
					qtyReceived: true,
				},
			},
		},
	});

	if (!component) return false;

	const qtyAllocated = component.stockAllocations.reduce(
		(sum, allocation) => sum + positiveNumber(allocation.qty),
		0,
	);
	const qtyInbound = component.inboundDemands.reduce(
		(sum, demand) => sum + positiveNumber(demand.qty),
		0,
	);
	const qtyReceived = component.inboundDemands.reduce(
		(sum, demand) => sum + positiveNumber(demand.qtyReceived),
		0,
	);
	const nextState = computeComponentDemandState({
		qtyRequired: positiveNumber(component.qty),
		qtyAllocated,
		qtyInbound,
		qtyReceived,
	});

	const updatedComponent = await db.lineItemComponents.updateMany({
		where: {
			id: component.id,
		},
		data: nextState,
	});

	return updatedComponent.count > 0;
}

async function assertSalesOrdersCanAutoResolveMarkAs(
	db: DbLike,
	salesOrderIds: number[],
) {
	if (!salesOrderIds.length) return;

	const sales = await db.salesOrders.findMany({
		where: {
			id: {
				in: salesOrderIds,
			},
			deletedAt: null,
			type: "order",
		},
		select: {
			id: true,
			orderId: true,
			status: true,
			prodStatus: true,
			deliveries: {
				where: {
					deletedAt: null,
				},
				select: {
					status: true,
					_count: {
						select: {
							items: true,
						},
					},
				},
			},
			stat: {
				where: {
					deletedAt: null,
					type: {
						in: ["dispatchCompleted", "dispatchInProgress", "dispatchAssigned"],
					},
				},
				select: {
					type: true,
					status: true,
					percentage: true,
				},
			},
		},
	});

	for (const sale of sales) {
		const fulfillmentStatus = resolveSalesInventoryFulfillmentStatus({
			deliveries: sale.deliveries,
			stats: sale.stat,
		});
		const lifecycle = getSalesOrderLifecycleStatusInfo({
			orderStatus: sale.status,
			legacyProductionStatus: sale.prodStatus,
			fulfillmentStatus,
		});

		if (lifecycle.status === "fulfilled" || lifecycle.status === "cancelled") {
			throw new Error(
				`Order ${sale.orderId} cannot auto-resolve inventory because it is ${lifecycle.status}.`,
			);
		}
	}
}

async function ensureAutoCreatedInboundSupplier(db: DbLike) {
	return db.supplier.upsert({
		where: {
			uid: AUTO_INBOUND_SUPPLIER_UID,
		},
		update: {
			name: AUTO_INBOUND_SUPPLIER_NAME,
			deletedAt: null,
		},
		create: {
			uid: AUTO_INBOUND_SUPPLIER_UID,
			name: AUTO_INBOUND_SUPPLIER_NAME,
		},
		select: {
			id: true,
			name: true,
		},
	});
}

export async function resolveSalesInventoryMarkAsAutoForContinue(
	db: Db,
	input: {
		salesOrderIds: number[];
		action: SalesInventoryMarkAsAction;
		authorName?: string | null;
		triggeredByUserId?: number | string | null;
	},
): Promise<ResolveSalesInventoryMarkAsAutoResult> {
	const salesOrderIds = Array.from(new Set(input.salesOrderIds)).filter(
		(id) => Number.isInteger(id) && id > 0,
	);

	return db.$transaction(async (tx) => {
		await assertSalesOrdersCanAutoResolveMarkAs(tx, salesOrderIds);
		const preflight = await getSalesInventoryMarkAsPreflight(tx, {
			salesOrderIds,
			action: input.action,
		});

		if (preflight.ok) {
			return {
				action: input.action,
				continueAllowed: true,
				approvedAllocationCount: 0,
				skippedAllocationCount: 0,
				createdDemandCount: 0,
				createdInboundShipmentCount: 0,
				createdInboundItemCount: 0,
				linkedDemandCount: 0,
				updatedSalesOrderCount: 0,
				auditHistoryCount: 0,
				skippedComponentCount: 0,
				preflight,
				remainingPreflight: preflight,
			};
		}

		const operationId = `mark-as-auto-${Date.now()}-${Math.random()
			.toString(36)
			.slice(2)}`;
		const allocationIds = uniquePositiveNumbers(
			preflight.blockers.flatMap(
				(blocker) => blocker.pendingStockAllocationIds,
			),
		);
		let approvedAllocationCount = 0;
		let skippedAllocationCount = 0;
		const allocationSaleIds = new Set<number>();

		if (allocationIds.length) {
			const allocations = await tx.stockAllocation.findMany({
				where: {
					id: {
						in: allocationIds,
					},
					deletedAt: null,
					status: "pending_review",
				},
				select: {
					id: true,
					lineItemComponentId: true,
					lineItemComponent: {
						select: {
							parent: {
								select: {
									saleId: true,
								},
							},
						},
					},
				},
			});
			const activeAllocationIds = allocations.map(
				(allocation) => allocation.id,
			);
			const updated = activeAllocationIds.length
				? await tx.stockAllocation.updateMany({
						where: {
							id: {
								in: activeAllocationIds,
							},
							deletedAt: null,
							status: "pending_review",
						},
						data: {
							status: "approved",
							notes: `Mark As auto-resolution approved allocation (${operationId})`,
						},
					})
				: { count: 0 };
			approvedAllocationCount = updated.count;
			skippedAllocationCount = Math.max(
				0,
				allocationIds.length - updated.count,
			);

			for (const allocation of allocations) {
				const saleId = allocation.lineItemComponent.parent.saleId;
				if (saleId) allocationSaleIds.add(saleId);
			}
			for (const componentId of uniquePositiveNumbers(
				allocations.map((allocation) => allocation.lineItemComponentId),
			)) {
				await recomputeLineItemComponentDemandState(tx, componentId);
			}
		}

		const fallbackSupplier = await ensureAutoCreatedInboundSupplier(tx);
		const inboundDemandIdsBySupplier = new Map<number, number[]>();
		const inboundSaleIds = new Set<number>();
		let createdDemandCount = 0;
		let skippedComponentCount = 0;

		const addDemandToSupplier = (supplierId: number, demandId: number) => {
			inboundDemandIdsBySupplier.set(supplierId, [
				...(inboundDemandIdsBySupplier.get(supplierId) || []),
				demandId,
			]);
		};

		for (const blocker of preflight.blockers) {
			for (const component of blocker.components) {
				const supplierId =
					component.autoInboundSupplierId || fallbackSupplier.id;

				for (const demandId of component.autoInboundDemandIds) {
					addDemandToSupplier(supplierId, demandId);
					inboundSaleIds.add(blocker.salesOrderId);
				}

				if (component.autoInboundQty <= 0) continue;
				if (!component.componentId || !component.inventoryVariantId) {
					skippedComponentCount += 1;
					continue;
				}

				const demand = await tx.inboundDemand.create({
					data: {
						lineItemComponentId: component.componentId,
						inventoryVariantId: component.inventoryVariantId,
						qty: component.autoInboundQty,
						status: "pending",
						notes: `Mark As auto-resolution created demand (${operationId})`,
					},
					select: {
						id: true,
					},
				});
				createdDemandCount += 1;
				addDemandToSupplier(supplierId, demand.id);
				inboundSaleIds.add(blocker.salesOrderId);
			}
		}

		let createdInboundShipmentCount = 0;
		let createdInboundItemCount = 0;
		let linkedDemandCount = 0;

		for (const [
			supplierId,
			demandIds,
		] of inboundDemandIdsBySupplier.entries()) {
			const uniqueDemandIds = uniquePositiveNumbers(demandIds);
			if (!uniqueDemandIds.length) continue;
			const result = await createInboundShipmentFromDemands(tx, {
				supplierId,
				demandIds: uniqueDemandIds,
				reference: `Auto Mark As ${input.action.replaceAll("_", " ")} ${operationId}`,
			});
			createdInboundShipmentCount += result.inboundId ? 1 : 0;
			createdInboundItemCount += result.createdItemCount;
			linkedDemandCount += result.linkedDemandCount;
		}

		for (const componentId of uniquePositiveNumbers(
			preflight.blockers.flatMap((blocker) =>
				blocker.components.map((component) => component.componentId),
			),
		)) {
			await recomputeLineItemComponentDemandState(tx, componentId);
		}

		const orderedSaleIds = Array.from(inboundSaleIds);
		const availableSaleIds = Array.from(allocationSaleIds).filter(
			(saleId) => !inboundSaleIds.has(saleId),
		);
		let updatedSalesOrderCount = 0;

		if (orderedSaleIds.length) {
			updatedSalesOrderCount += (
				await tx.salesOrders.updateMany({
					where: {
						id: {
							in: orderedSaleIds,
						},
						deletedAt: null,
						type: "order",
					},
					data: {
						inventoryStatus: "ORDERED",
					},
				})
			).count;
		}
		if (availableSaleIds.length) {
			updatedSalesOrderCount += (
				await tx.salesOrders.updateMany({
					where: {
						id: {
							in: availableSaleIds,
						},
						deletedAt: null,
						type: "order",
					},
					data: {
						inventoryStatus: "AVAILABLE",
					},
				})
			).count;
		}

		const auditedSales = await tx.salesOrders.findMany({
			where: {
				id: {
					in: uniquePositiveNumbers([
						...orderedSaleIds,
						...availableSaleIds,
						...preflight.blockers.map((blocker) => blocker.salesOrderId),
					]),
				},
				deletedAt: null,
				type: "order",
			},
			select: {
				id: true,
				orderId: true,
				inventoryStatus: true,
			},
		});
		let auditHistoryCount = 0;
		for (const sale of auditedSales) {
			await tx.salesHistory.create({
				data: {
					salesId: sale.id,
					name: "Inventory auto-resolved for Mark As",
					authorName: input.authorName || "System",
					data: {
						type: "sales_inventory_mark_as_auto_resolved",
						action: input.action,
						orderId: sale.orderId,
						nextInventoryStatus: orderedSaleIds.includes(sale.id)
							? "ORDERED"
							: availableSaleIds.includes(sale.id)
								? "AVAILABLE"
								: (sale.inventoryStatus ?? null),
						approvedAllocationCount,
						skippedAllocationCount,
						createdDemandCount,
						createdInboundShipmentCount,
						createdInboundItemCount,
						linkedDemandCount,
						skippedComponentCount,
						operationId,
						triggeredByUserId: input.triggeredByUserId ?? null,
					},
				},
			});
			auditHistoryCount += 1;
		}

		const remainingPreflight = await getSalesInventoryMarkAsPreflight(tx, {
			salesOrderIds,
			action: input.action,
		});

		return {
			action: input.action,
			continueAllowed: true,
			approvedAllocationCount,
			skippedAllocationCount,
			createdDemandCount,
			createdInboundShipmentCount,
			createdInboundItemCount,
			linkedDemandCount,
			updatedSalesOrderCount,
			auditHistoryCount,
			skippedComponentCount,
			preflight,
			remainingPreflight,
		};
	});
}

export async function resolveSalesInventoryMarkAsAvailabilityForContinue(
	db: Db,
	input: {
		salesOrderIds: number[];
		action: SalesInventoryMarkAsAction;
		authorName?: string | null;
		triggeredByUserId?: number | string | null;
	},
): Promise<ResolveSalesInventoryMarkAsAvailabilityResult> {
	const salesOrderIds = Array.from(new Set(input.salesOrderIds)).filter(
		(id) => Number.isInteger(id) && id > 0,
	);

	return db.$transaction(async (tx) => {
		const preflight = await getSalesInventoryMarkAsPreflight(tx, {
			salesOrderIds,
			action: input.action,
		});

		if (preflight.ok || !preflight.canResolveAndContinue) {
			return {
				action: input.action,
				continueAllowed: preflight.ok,
				cancelledDemandCount: 0,
				recomputedComponentCount: 0,
				updatedSalesOrderCount: 0,
				auditHistoryCount: 0,
				preflight,
				remainingPreflight: preflight,
			};
		}

		const demandIds = Array.from(
			new Set(
				preflight.blockers.flatMap((blocker) => blocker.resolvableDemandIds),
			),
		);
		const affectedSalesOrderIds = preflight.blockers
			.filter((blocker) => blocker.resolvableDemandIds.length > 0)
			.map((blocker) => blocker.salesOrderId);
		const demandRows = demandIds.length
			? await tx.inboundDemand.findMany({
					where: {
						id: {
							in: demandIds,
						},
						deletedAt: null,
						status: {
							in: ["pending", "ordered"],
						},
						inboundShipmentItemId: null,
						qtyReceived: 0,
						lineItemComponent: {
							parent: {
								saleId: {
									in: affectedSalesOrderIds,
								},
								deletedAt: null,
							},
						},
					},
					select: {
						id: true,
						lineItemComponentId: true,
						lineItemComponent: {
							select: {
								parent: {
									select: {
										saleId: true,
									},
								},
							},
						},
					},
				})
			: [];
		const safeDemandIds = demandRows.map((demand) => demand.id);
		const operationId = `mark-as-availability-${Date.now()}-${Math.random()
			.toString(36)
			.slice(2)}`;
		const operationNote = `Mark As inventory preflight: AVAILABLE (${operationId})`;
		if (safeDemandIds.length) {
			await tx.inboundDemand.updateMany({
				where: {
					id: {
						in: safeDemandIds,
					},
					deletedAt: null,
					status: {
						in: ["pending", "ordered"],
					},
					inboundShipmentItemId: null,
					qtyReceived: 0,
				},
				data: {
					status: "cancelled",
					deletedAt: new Date(),
					notes: operationNote,
				},
			});
		}
		const appliedDemandRows = safeDemandIds.length
			? await tx.inboundDemand.findMany({
					where: {
						id: {
							in: safeDemandIds,
						},
						status: "cancelled",
						deletedAt: {
							not: null,
						},
						notes: operationNote,
						inboundShipmentItemId: null,
						qtyReceived: 0,
						lineItemComponent: {
							parent: {
								saleId: {
									in: affectedSalesOrderIds,
								},
								deletedAt: null,
							},
						},
					},
					select: {
						id: true,
						lineItemComponentId: true,
						lineItemComponent: {
							select: {
								parent: {
									select: {
										saleId: true,
									},
								},
							},
						},
					},
				})
			: [];
		const appliedAffectedSalesOrderIds = Array.from(
			new Set(
				appliedDemandRows
					.map((demand) => demand.lineItemComponent.parent.saleId)
					.filter(
						(id): id is number =>
							typeof id === "number" && Number.isInteger(id) && id > 0,
					),
			),
		);
		const componentIds = uniquePositiveNumbers(
			appliedDemandRows.map((demand) => demand.lineItemComponentId),
		);
		let recomputedComponentCount = 0;

		for (const componentId of componentIds) {
			const recomputed = await recomputeLineItemComponentDemandState(
				tx,
				componentId,
			);
			if (recomputed) recomputedComponentCount += 1;
		}

		const previousSalesOrders = appliedAffectedSalesOrderIds.length
			? await tx.salesOrders.findMany({
					where: {
						id: {
							in: appliedAffectedSalesOrderIds,
						},
						deletedAt: null,
						type: "order",
					},
					select: {
						id: true,
						orderId: true,
						inventoryStatus: true,
					},
				})
			: [];
		const updatedOrders = appliedAffectedSalesOrderIds.length
			? await tx.salesOrders.updateMany({
					where: {
						id: {
							in: appliedAffectedSalesOrderIds,
						},
						deletedAt: null,
						type: "order",
					},
					data: {
						inventoryStatus: "AVAILABLE",
					},
				})
			: { count: 0 };
		let auditHistoryCount = 0;

		for (const order of previousSalesOrders) {
			const orderDemandRows = appliedDemandRows.filter(
				(demand) => demand.lineItemComponent.parent.saleId === order.id,
			);
			const orderDemandIds = orderDemandRows.map((demand) => demand.id);
			const orderComponentIds = Array.from(
				new Set(orderDemandRows.map((demand) => demand.lineItemComponentId)),
			);

			await tx.salesHistory.create({
				data: {
					salesId: order.id,
					name: "Inventory availability resolved for Mark As",
					authorName: input.authorName || "System",
					data: {
						type: "sales_inventory_mark_as_availability_resolved",
						action: input.action,
						orderId: order.orderId,
						previousInventoryStatus: order.inventoryStatus ?? null,
						nextInventoryStatus: "AVAILABLE",
						cancelledDemandIds: orderDemandIds,
						cancelledDemandCount: orderDemandIds.length,
						recomputedComponentIds: orderComponentIds,
						recomputedComponentCount: orderComponentIds.length,
						operationId,
						triggeredByUserId: input.triggeredByUserId ?? null,
					},
				},
			});
			auditHistoryCount += 1;
		}
		const remainingPreflight = await getSalesInventoryMarkAsPreflight(tx, {
			salesOrderIds,
			action: input.action,
		});

		return {
			action: input.action,
			continueAllowed: remainingPreflight.ok,
			cancelledDemandCount: appliedDemandRows.length,
			recomputedComponentCount,
			updatedSalesOrderCount: updatedOrders.count,
			auditHistoryCount,
			preflight,
			remainingPreflight,
		};
	});
}
