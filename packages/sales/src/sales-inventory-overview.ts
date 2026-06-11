import type { Db } from "@gnd/db";

const FULFILLED_COMPONENT_STATUSES = new Set(["allocated", "fulfilled"]);
const INBOUND_COMPONENT_STATUSES = new Set([
	"inbound_required",
	"partially_received",
]);
const REVIEW_COMPONENT_STATUSES = new Set(["pending", "partially_allocated"]);

export type SalesInventoryOverviewReadiness =
	| "not_synced"
	| "allocation_review"
	| "awaiting_inbound"
	| "ready_for_production"
	| "fulfilled";

export type SalesInventoryOverviewStatusCounts = Record<string, number>;

export type SalesInventoryOverviewSummary = {
	lineItemCount: number;
	componentCount: number;
	requiredComponentCount: number;
	qtyRequired: number;
	qtyAllocated: number;
	qtyInbound: number;
	qtyReceived: number;
	statusCounts: SalesInventoryOverviewStatusCounts;
	readiness: SalesInventoryOverviewReadiness;
};

export type SalesInventoryOverviewComponentLike = {
	required?: boolean | null;
	qty?: number | null;
	qtyAllocated?: number | null;
	qtyInbound?: number | null;
	qtyReceived?: number | null;
	status?: string | null;
};

export type SalesInventoryOverviewLineItemLike = {
	components?: SalesInventoryOverviewComponentLike[] | null;
};

export type GetSalesInventoryOverviewInput = {
	salesOrderId: number;
};

function addStatusCount(
	counts: SalesInventoryOverviewStatusCounts,
	status: string,
) {
	counts[status] = (counts[status] || 0) + 1;
}

function numberValue(value?: number | null) {
	return Number(value || 0);
}

export function summarizeSalesInventoryOverview(
	lineItems: SalesInventoryOverviewLineItemLike[],
): SalesInventoryOverviewSummary {
	const statusCounts: SalesInventoryOverviewStatusCounts = {};
	let componentCount = 0;
	let requiredComponentCount = 0;
	let qtyRequired = 0;
	let qtyAllocated = 0;
	let qtyInbound = 0;
	let qtyReceived = 0;
	let hasInbound = false;
	let hasReview = false;
	let allFulfilled = true;
	let allProductionReady = true;

	for (const lineItem of lineItems) {
		for (const component of lineItem.components || []) {
			const status = component.status || "pending";
			const componentQtyRequired = numberValue(component.qty);
			const componentQtyAllocated = numberValue(component.qtyAllocated);
			const componentQtyInbound = numberValue(component.qtyInbound);
			const componentQtyReceived = numberValue(component.qtyReceived);

			componentCount += 1;
			if (component.required) requiredComponentCount += 1;
			qtyRequired += componentQtyRequired;
			qtyAllocated += componentQtyAllocated;
			qtyInbound += componentQtyInbound;
			qtyReceived += componentQtyReceived;
			addStatusCount(statusCounts, status);

			const stillAwaitingInbound =
				componentQtyInbound > 0 && componentQtyReceived < componentQtyInbound;
			hasInbound =
				hasInbound || INBOUND_COMPONENT_STATUSES.has(status) || stillAwaitingInbound;
			hasReview = hasReview || REVIEW_COMPONENT_STATUSES.has(status);
			allFulfilled = allFulfilled && status === "fulfilled";
			allProductionReady =
				allProductionReady && FULFILLED_COMPONENT_STATUSES.has(status);
		}
	}

	let readiness: SalesInventoryOverviewReadiness = "not_synced";
	if (componentCount > 0) {
		if (hasInbound) {
			readiness = "awaiting_inbound";
		} else if (hasReview) {
			readiness = "allocation_review";
		} else if (allFulfilled) {
			readiness = "fulfilled";
		} else if (allProductionReady) {
			readiness = "ready_for_production";
		} else {
			readiness = "allocation_review";
		}
	}

	return {
		lineItemCount: lineItems.length,
		componentCount,
		requiredComponentCount,
		qtyRequired,
		qtyAllocated,
		qtyInbound,
		qtyReceived,
		statusCounts,
		readiness,
	};
}

export async function getSalesInventoryOverview(
	db: Db,
	input: GetSalesInventoryOverviewInput,
) {
	const sale = await db.salesOrders.findUnique({
		where: {
			id: input.salesOrderId,
		},
		select: {
			id: true,
			orderId: true,
			status: true,
			inventoryStatus: true,
			prodStatus: true,
			lineItems: {
				where: {
					deletedAt: null,
					lineItemType: "SALE",
				},
				orderBy: [
					{
						sn: "asc",
					},
					{
						id: "asc",
					},
				],
				select: {
					id: true,
					uid: true,
					sn: true,
					title: true,
					description: true,
					qty: true,
					unitCost: true,
					totalCost: true,
					meta: true,
					salesItemId: true,
					inventoryId: true,
					inventoryVariantId: true,
					inventoryCategoryId: true,
					salesItem: {
						select: {
							id: true,
							description: true,
							dykeDescription: true,
							qty: true,
							rate: true,
							total: true,
							prodStatus: true,
							sentToProdAt: true,
							prodStartedAt: true,
							prodCompletedAt: true,
						},
					},
					inventory: {
						select: {
							id: true,
							uid: true,
							name: true,
							productKind: true,
							stockMode: true,
							status: true,
						},
					},
					variant: {
						select: {
							id: true,
							uid: true,
							sku: true,
							status: true,
						},
					},
					inventoryCategory: {
						select: {
							id: true,
							uid: true,
							title: true,
							productKind: true,
							stockMode: true,
						},
					},
					price: true,
					components: {
						orderBy: {
							id: "asc",
						},
						select: {
							id: true,
							required: true,
							qty: true,
							qtyAllocated: true,
							qtyInbound: true,
							qtyReceived: true,
							status: true,
							inventoryId: true,
							inventoryVariantId: true,
							inventoryCategoryId: true,
							inventory: {
								select: {
									id: true,
									uid: true,
									name: true,
									productKind: true,
									stockMode: true,
									status: true,
								},
							},
							inventoryVariant: {
								select: {
									id: true,
									uid: true,
									sku: true,
									status: true,
								},
							},
							inventoryCategory: {
								select: {
									id: true,
									uid: true,
									title: true,
									productKind: true,
									stockMode: true,
								},
							},
							subComponent: {
								select: {
									id: true,
									required: true,
									index: true,
									status: true,
									inventoryCategoryId: true,
									defaultInventoryId: true,
								},
							},
							price: true,
							stockAllocations: {
								where: {
									deletedAt: null,
									status: {
										not: "cancelled",
									},
								},
								select: {
									id: true,
									qty: true,
									status: true,
									inventoryStockId: true,
									inventoryVariantId: true,
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
									inventoryVariantId: true,
								},
							},
						},
					},
				},
			},
		},
	});

	if (!sale) return null;

	return {
		...sale,
		summary: summarizeSalesInventoryOverview(sale.lineItems),
	};
}
