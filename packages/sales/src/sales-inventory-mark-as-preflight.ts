import type { Db, TransactionClient } from "@gnd/db";

import type { SalesInventoryOverviewReadiness } from "./sales-inventory-overview";

type DbLike = Db | TransactionClient;

export type SalesInventoryMarkAsAction =
	| "production_completed"
	| "fulfilled";

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
	} | null;
	inventoryVariant?: {
		sku?: string | null;
		uid?: string | null;
	} | null;
	inboundDemands?: DemandLike[] | null;
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
	return component.inventoryVariant?.sku || component.inventoryVariant?.uid || null;
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
				const resolvableDemandQty = resolvableDemands.reduce(
					(sum, demand) => sum + openDemandQty(demand),
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

				unresolvedComponentCount += 1;
				pendingQty += componentPendingQty;
				openInboundQtyTotal += inboundBacklog;
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
								},
							},
							inventoryVariant: {
								select: {
									sku: true,
									uid: true,
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

async function recomputeLineItemComponentDemandState(
	db: DbLike,
	lineItemComponentId: number,
) {
	const component = await db.lineItemComponents.findFirst({
		where: {
			id: lineItemComponentId,
			deletedAt: null,
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
			deletedAt: null,
		},
		data: nextState,
	});

	return updatedComponent.count > 0;
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
					.filter((id) => Number.isInteger(id) && id > 0),
			),
		);
		const componentIds = Array.from(
			new Set(appliedDemandRows.map((demand) => demand.lineItemComponentId)),
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
