import type { Db, TransactionClient } from "@gnd/db";

const COMMITTED_ALLOCATION_STATUSES = new Set([
	"approved",
	"reserved",
	"picked",
	"consumed",
]);
const PICKED_ALLOCATION_STATUSES = new Set(["picked", "consumed"]);
const SHIPPED_ALLOCATION_STATUSES = new Set(["consumed"]);
const ACTIVE_PACKING_STATUSES = new Set(["packed"]);
const COMPLETED_DELIVERY_STATUSES = new Set(["completed", "delivered"]);

type DbLike = Db | TransactionClient;

export type SalesFulfillmentStatus =
	| "not_fulfilled"
	| "partially_fulfilled"
	| "backordered"
	| "awaiting_inbound"
	| "ready_to_ship_remaining"
	| "fulfilled";

export type SalesBackorderQueueStatus = Extract<
	SalesFulfillmentStatus,
	"awaiting_inbound" | "backordered" | "ready_to_ship_remaining"
>;

const DEFAULT_BACKORDER_QUEUE_STATUSES: SalesBackorderQueueStatus[] = [
	"awaiting_inbound",
	"backordered",
	"ready_to_ship_remaining",
];

export type FulfillmentAllocationLike = {
	qty?: number | null;
	status?: string | null;
};

export type FulfillmentInboundDemandLike = {
	qty?: number | null;
	qtyReceived?: number | null;
	status?: string | null;
};

export type FulfillmentDeliveryLike = {
	qty?: number | null;
	packingStatus?: string | null;
	status?: string | null;
	delivery?: {
		status?: string | null;
		deliveredAt?: Date | string | null;
	} | null;
};

export type FulfillmentComponentLike = {
	id?: number | null;
	required?: boolean | null;
	qty?: number | null;
	qtyAllocated?: number | null;
	qtyInbound?: number | null;
	qtyReceived?: number | null;
	status?: string | null;
	inventoryId?: number | null;
	inventoryVariantId?: number | null;
	inventoryCategoryId?: number | null;
	subComponentId?: number | null;
	inventory?: {
		id?: number | null;
		name?: string | null;
		productKind?: string | null;
		defaultSupplier?: {
			id?: number | null;
			name?: string | null;
		} | null;
	} | null;
	inventoryVariant?: {
		id?: number | null;
		sku?: string | null;
		description?: string | null;
	} | null;
	inventoryCategory?: {
		id?: number | null;
		title?: string | null;
		productKind?: string | null;
	} | null;
	subComponent?: {
		id?: number | null;
		inventoryCategory?: {
			id?: number | null;
			title?: string | null;
		} | null;
		defaultInventory?: {
			id?: number | null;
			name?: string | null;
		} | null;
	} | null;
	stockAllocations?: FulfillmentAllocationLike[] | null;
	inboundDemands?: FulfillmentInboundDemandLike[] | null;
};

export type FulfillmentLineLike = {
	id?: number | null;
	uid?: string | null;
	title?: string | null;
	qty?: number | null;
	components?: FulfillmentComponentLike[] | null;
	salesItem?: {
		id?: number | null;
		description?: string | null;
		qty?: number | null;
		itemDeliveries?: FulfillmentDeliveryLike[] | null;
	} | null;
};

export type SalesFulfillmentQuantitySnapshot = {
	orderedQty: number;
	allocatedQty: number;
	pendingReviewQty: number;
	pickedQty: number;
	shippedQty: number;
	remainingQty: number;
	backorderedQty: number;
	inboundQty: number;
	receivedQty: number;
};

export type SalesFulfillmentComponentProjection =
	SalesFulfillmentQuantitySnapshot & {
		id: number | null;
		required: boolean;
		status: SalesFulfillmentStatus;
		inventoryStatus: string | null;
		inventoryId: number | null;
		inventoryVariantId: number | null;
		inventoryCategoryId: number | null;
		subComponentId: number | null;
		inventoryName: string | null;
		inventoryVariantSku: string | null;
		inventoryVariantDescription: string | null;
		inventoryCategoryName: string | null;
		componentName: string | null;
		supplierId: number | null;
		supplierName: string | null;
	};

export type SalesFulfillmentLineProjection =
	SalesFulfillmentQuantitySnapshot & {
		id: number | null;
		uid: string | null;
		title: string | null;
		status: SalesFulfillmentStatus;
		components: SalesFulfillmentComponentProjection[];
	};

export type SalesFulfillmentPlanSummary = SalesFulfillmentQuantitySnapshot & {
	lineCount: number;
	componentCount: number;
	status: SalesFulfillmentStatus;
	statusCounts: Record<SalesFulfillmentStatus, number>;
};

export type SalesFulfillmentPlan = {
	summary: SalesFulfillmentPlanSummary;
	lines: SalesFulfillmentLineProjection[];
};

export type GetSalesFulfillmentPlanInput = {
	salesOrderId: number;
};

export type SalesBackorderQueueLineLike = FulfillmentLineLike & {
	saleId?: number | null;
	sale?: {
		id?: number | null;
		orderId?: string | null;
		status?: string | null;
		inventoryStatus?: string | null;
		prodStatus?: string | null;
		customer?: {
			name?: string | null;
			businessName?: string | null;
		} | null;
	} | null;
};

export type SalesBackorderQueueItem = SalesFulfillmentQuantitySnapshot & {
	salesOrderId: number | null;
	orderId: string | null;
	orderStatus: string | null;
	inventoryStatus: string | null;
	prodStatus: string | null;
	customerName: string | null;
	lineItemId: number | null;
	salesItemId: number | null;
	uid: string | null;
	title: string | null;
	status: SalesBackorderQueueStatus;
	blockerComponents: SalesFulfillmentComponentProjection[];
};

export type SalesBackorderQueueSummary = {
	totalCount: number;
	statusCounts: Record<SalesBackorderQueueStatus, number>;
	orderedQty: number;
	shippedQty: number;
	remainingQty: number;
	backorderedQty: number;
	inboundQty: number;
	receivedQty: number;
};

export type SalesBackorderQueue = {
	summary: SalesBackorderQueueSummary;
	items: SalesBackorderQueueItem[];
	nextCursorId: number | null;
};

export type GetSalesBackorderQueueInput = {
	salesOrderId?: number | null;
	inventoryVariantId?: number | null;
	statuses?: SalesBackorderQueueStatus[] | null;
	cursorId?: number | null;
	limit?: number;
};

export type SalesProductionReadiness =
	| "ready_for_production"
	| "fulfilled"
	| "awaiting_inbound"
	| "allocation_review"
	| "blocked";

export type SalesProductionStockStatus =
	| "allocated"
	| "pending_review"
	| "awaiting_inbound"
	| "partially_received"
	| "ready_after_receive"
	| "shortage"
	| "fulfilled";

export type SalesProductionPlanLineLike = SalesBackorderQueueLineLike;

export type SalesProductionPlanComponent = SalesFulfillmentQuantitySnapshot & {
	salesOrderId: number | null;
	orderId: string | null;
	customerName: string | null;
	lineItemId: number | null;
	salesItemId: number | null;
	lineTitle: string | null;
	componentId: number | null;
	componentName: string | null;
	inventoryId: number | null;
	inventoryVariantId: number | null;
	inventoryCategoryId: number | null;
	inventoryVariantSku: string | null;
	supplierId: number | null;
	supplierName: string | null;
	required: boolean;
	stockStatus: SalesProductionStockStatus;
	readiness: SalesProductionReadiness;
	lineReadiness: SalesProductionReadiness;
};

export type SalesProductionPlanGroup = {
	key: string;
	label: string;
	salesOrderId?: number | null;
	lineItemId?: number | null;
	componentId?: number | null;
	inventoryVariantId?: number | null;
	supplierId?: number | null;
	stockStatus?: SalesProductionStockStatus;
	componentCount: number;
	lineCount: number;
	orderedQty: number;
	allocatedQty: number;
	pendingReviewQty: number;
	backorderedQty: number;
	inboundQty: number;
	receivedQty: number;
	readiness: SalesProductionReadiness;
};

export type SalesProductionPlanSummary = SalesFulfillmentQuantitySnapshot & {
	lineCount: number;
	componentCount: number;
	readyLineCount: number;
	blockedLineCount: number;
	supplierCount: number;
	readiness: SalesProductionReadiness;
	readinessCounts: Record<SalesProductionReadiness, number>;
	stockStatusCounts: Record<SalesProductionStockStatus, number>;
};

export type SalesProductionPlan = {
	summary: SalesProductionPlanSummary;
	components: SalesProductionPlanComponent[];
	groups: {
		bySale: SalesProductionPlanGroup[];
		bySalesItem: SalesProductionPlanGroup[];
		byComponent: SalesProductionPlanGroup[];
		bySupplier: SalesProductionPlanGroup[];
		byStockStatus: SalesProductionPlanGroup[];
	};
};

export type GetSalesProductionPlanInput = {
	salesOrderId?: number | null;
	inventoryVariantId?: number | null;
	supplierId?: number | null;
	readinesses?: SalesProductionReadiness[] | null;
	limit?: number;
};

export type PlanAvailableShipmentComponentInput = {
	componentId: number;
	required?: boolean | null;
	orderedQty?: number | null;
	availableQty?: number | null;
	inboundQty?: number | null;
	receivedQty?: number | null;
	inventoryVariantId?: number | null;
};

export type PlannedShipmentComponentConsumption = {
	componentId: number;
	consumeQty: number;
	backorderedQty: number;
	inventoryVariantId: number | null;
};

export type PlanAvailableShipmentForLineInput = {
	orderedQty?: number | null;
	alreadyShippedQty?: number | null;
	components?: PlanAvailableShipmentComponentInput[] | null;
};

export type PlannedAvailableShipmentLine = {
	orderedQty: number;
	alreadyShippedQty: number;
	remainingQty: number;
	shipQty: number;
	backorderedQty: number;
	components: PlannedShipmentComponentConsumption[];
};

export type ShipAvailableSalesInventoryInput = {
	salesOrderId: number;
	lineItemIds?: number[];
	deliveryMode?: string | null;
	deliveredTo?: string | null;
	createdByUserId?: number | null;
	authorName?: string | null;
	note?: string | null;
};

export type ShipAvailableSalesInventoryResult = {
	ok: boolean;
	salesOrderId: number;
	deliveryId: number | null;
	shippedLineCount: number;
	shippedQty: number;
	backorderedQty: number;
	consumedAllocationQty: number;
	inboundDemandCreatedQty: number;
	lines: Array<{
		lineItemId: number;
		salesItemId: number;
		shipQty: number;
		backorderedQty: number;
	}>;
};

export type PlanReceivedBackorderAllocationInput = {
	requiredQty?: number | null;
	allocatedQty?: number | null;
	receivedQty?: number | null;
	availableStockQty?: number | null;
};

export type PlannedReceivedBackorderAllocation = {
	shortageQty: number;
	reserveQty: number;
	remainingBackorderQty: number;
};

export type AllocateReceivedInboundToBackordersInput = {
	salesOrderId?: number | null;
	lineItemComponentIds?: number[];
	inventoryVariantId?: number | null;
	limit?: number;
	authorName?: string | null;
	note?: string | null;
};

export type AllocateReceivedInboundToBackordersResult = {
	ok: boolean;
	processedDemandCount: number;
	touchedComponentCount: number;
	allocatedQty: number;
	remainingBackorderQty: number;
	allocations: Array<{
		lineItemComponentId: number;
		inventoryVariantId: number;
		inventoryStockId: number;
		qty: number;
	}>;
};

function numberValue(value?: number | null) {
	return Math.max(0, Number(value || 0));
}

function integerQty(value?: number | null) {
	return Math.max(0, Math.floor(numberValue(value)));
}

function sumBy<T>(items: T[] | null | undefined, read: (item: T) => number) {
	return (items || []).reduce((total, item) => total + read(item), 0);
}

function roundQuantity(value: number) {
	return Math.round(value * 1000) / 1000;
}

export function planAvailableShipmentForLine(
	input: PlanAvailableShipmentForLineInput,
): PlannedAvailableShipmentLine {
	const orderedQty = integerQty(input.orderedQty);
	const alreadyShippedQty = integerQty(input.alreadyShippedQty);
	const remainingQty = Math.max(0, orderedQty - alreadyShippedQty);
	const components = input.components || [];
	const blockingComponents = components.filter((component) => component.required);

	if (orderedQty <= 0 || remainingQty <= 0 || !blockingComponents.length) {
		return {
			orderedQty,
			alreadyShippedQty,
			remainingQty,
			shipQty: 0,
			backorderedQty: remainingQty,
			components: [],
		};
	}

	const componentPlans = blockingComponents.map((component) => {
		const requiredQty = numberValue(component.orderedQty);
		const perUnitQty = orderedQty > 0 ? requiredQty / orderedQty : requiredQty;
		const availableQty = numberValue(component.availableQty);
		const availableUnits =
			perUnitQty > 0 ? Math.floor(availableQty / perUnitQty) : remainingQty;

		return {
			component,
			perUnitQty,
			availableUnits,
		};
	});
	const shipQty = Math.min(
		remainingQty,
		...componentPlans.map((plan) => plan.availableUnits),
	);
	const backorderedQty = Math.max(0, remainingQty - shipQty);

	return {
		orderedQty,
		alreadyShippedQty,
		remainingQty,
		shipQty,
		backorderedQty,
		components: componentPlans.map((plan) => ({
			componentId: plan.component.componentId,
			consumeQty: roundQuantity(shipQty * plan.perUnitQty),
			backorderedQty: roundQuantity(backorderedQty * plan.perUnitQty),
			inventoryVariantId: plan.component.inventoryVariantId ?? null,
		})),
	};
}

export function planReceivedBackorderAllocation(
	input: PlanReceivedBackorderAllocationInput,
): PlannedReceivedBackorderAllocation {
	const requiredQty = numberValue(input.requiredQty);
	const allocatedQty = numberValue(input.allocatedQty);
	const receivedQty = numberValue(input.receivedQty);
	const availableStockQty = numberValue(input.availableStockQty);
	const shortageQty = roundQuantity(Math.max(0, requiredQty - allocatedQty));
	const reserveQty = roundQuantity(
		Math.min(shortageQty, receivedQty, availableStockQty),
	);

	return {
		shortageQty,
		reserveQty,
		remainingBackorderQty: roundQuantity(Math.max(0, shortageQty - reserveQty)),
	};
}

function isCompletedDelivery(delivery: FulfillmentDeliveryLike) {
	if (!ACTIVE_PACKING_STATUSES.has(delivery.packingStatus || "")) return false;
	const status = delivery.delivery?.status || delivery.status || "";
	return COMPLETED_DELIVERY_STATUSES.has(status) || !!delivery.delivery?.deliveredAt;
}

function isPackedDelivery(delivery: FulfillmentDeliveryLike) {
	return ACTIVE_PACKING_STATUSES.has(delivery.packingStatus || "");
}

function getComponentName(component: FulfillmentComponentLike) {
	return (
		component.inventory?.name ||
		component.subComponent?.defaultInventory?.name ||
		component.inventoryCategory?.title ||
		component.subComponent?.inventoryCategory?.title ||
		null
	);
}

function getSupplier(component: FulfillmentComponentLike) {
	return component.inventory?.defaultSupplier || null;
}

function summarizeComponent(
	component: FulfillmentComponentLike,
): SalesFulfillmentComponentProjection {
	const allocations = component.stockAllocations || [];
	const inboundDemands = component.inboundDemands || [];
	const allocationQty = sumBy(allocations, (allocation) =>
		COMMITTED_ALLOCATION_STATUSES.has(allocation.status || "")
			? numberValue(allocation.qty)
			: 0,
	);
	const allocatedQty =
		allocations.length > 0 ? allocationQty : numberValue(component.qtyAllocated);
	const pendingReviewQty = sumBy(allocations, (allocation) =>
		allocation.status === "pending_review" ? numberValue(allocation.qty) : 0,
	);
	const pickedQty = sumBy(allocations, (allocation) =>
		PICKED_ALLOCATION_STATUSES.has(allocation.status || "")
			? numberValue(allocation.qty)
			: 0,
	);
	const shippedQty = sumBy(allocations, (allocation) =>
		SHIPPED_ALLOCATION_STATUSES.has(allocation.status || "")
			? numberValue(allocation.qty)
			: 0,
	);
	const inboundQty =
		inboundDemands.length > 0
			? sumBy(inboundDemands, (demand) =>
					demand.status === "cancelled" ? 0 : numberValue(demand.qty),
				)
			: numberValue(component.qtyInbound);
	const receivedQty =
		inboundDemands.length > 0
			? sumBy(inboundDemands, (demand) =>
					demand.status === "cancelled" ? 0 : numberValue(demand.qtyReceived),
				)
			: numberValue(component.qtyReceived);
	const orderedQty = numberValue(component.qty);
	const remainingQty = Math.max(0, orderedQty - shippedQty);
	const backorderedQty = Math.max(
		0,
		orderedQty - allocatedQty - pendingReviewQty - receivedQty,
	);
	const awaitingInbound =
		inboundQty > receivedQty && (backorderedQty > 0 || remainingQty > 0);

	let status: SalesFulfillmentStatus = "not_fulfilled";
	if (orderedQty > 0 && shippedQty >= orderedQty) {
		status = "fulfilled";
	} else if (awaitingInbound) {
		status = "awaiting_inbound";
	} else if (backorderedQty > 0) {
		status = "backordered";
	} else if (shippedQty > 0 && remainingQty > 0) {
		status = "ready_to_ship_remaining";
	} else if (pickedQty > 0 || shippedQty > 0) {
		status = "partially_fulfilled";
	}

	return {
		id: component.id ?? null,
		required: !!component.required,
		orderedQty,
		allocatedQty,
		pendingReviewQty,
		pickedQty,
		shippedQty,
		remainingQty,
		backorderedQty,
		inboundQty,
		receivedQty,
		status,
		inventoryStatus: component.status || null,
		inventoryId: component.inventory?.id ?? component.inventoryId ?? null,
		inventoryVariantId:
			component.inventoryVariant?.id ?? component.inventoryVariantId ?? null,
		inventoryCategoryId:
			component.inventoryCategory?.id ?? component.inventoryCategoryId ?? null,
		subComponentId: component.subComponent?.id ?? component.subComponentId ?? null,
		inventoryName: component.inventory?.name ?? null,
		inventoryVariantSku: component.inventoryVariant?.sku ?? null,
		inventoryVariantDescription:
			component.inventoryVariant?.description ?? null,
		inventoryCategoryName:
			component.inventoryCategory?.title ??
			component.subComponent?.inventoryCategory?.title ??
			null,
		componentName: getComponentName(component),
		supplierId: getSupplier(component)?.id ?? null,
		supplierName: getSupplier(component)?.name ?? null,
	};
}

function deriveLineStatus(
	orderedQty: number,
	shippedQty: number,
	remainingQty: number,
	components: SalesFulfillmentComponentProjection[],
): SalesFulfillmentStatus {
	const requiredComponents = components.filter((component) => component.required);
	const blockingComponents = requiredComponents.length
		? requiredComponents
		: components;

	if (orderedQty > 0 && shippedQty >= orderedQty) return "fulfilled";
	if (
		blockingComponents.some(
			(component) => component.status === "awaiting_inbound",
		)
	) {
		return "awaiting_inbound";
	}
	if (
		blockingComponents.some((component) => component.status === "backordered")
	) {
		return "backordered";
	}
	if (shippedQty > 0 && remainingQty > 0) return "ready_to_ship_remaining";
	if (shippedQty > 0) return "partially_fulfilled";
	return "not_fulfilled";
}

function summarizeLine(line: FulfillmentLineLike): SalesFulfillmentLineProjection {
	const deliveries = line.salesItem?.itemDeliveries || [];
	const components = (line.components || []).map(summarizeComponent);
	const orderedQty = numberValue(line.qty ?? line.salesItem?.qty ?? 0);
	const pickedQty = sumBy(deliveries, (delivery) =>
		isPackedDelivery(delivery) ? numberValue(delivery.qty) : 0,
	);
	const shippedQty = sumBy(deliveries, (delivery) =>
		isCompletedDelivery(delivery) ? numberValue(delivery.qty) : 0,
	);
	const remainingQty = Math.max(0, orderedQty - shippedQty);
	const componentBackorderedQty = sumBy(
		components.filter((component) => component.required),
		(component) => component.backorderedQty,
	);
	const backorderedQty =
		componentBackorderedQty > 0 ? Math.min(remainingQty, componentBackorderedQty) : 0;
	const allocatedQty = sumBy(components, (component) => component.allocatedQty);
	const pendingReviewQty = sumBy(
		components,
		(component) => component.pendingReviewQty,
	);
	const inboundQty = sumBy(components, (component) => component.inboundQty);
	const receivedQty = sumBy(components, (component) => component.receivedQty);

	return {
		id: line.id ?? null,
		uid: line.uid ?? null,
		title:
			line.title ||
			line.salesItem?.description ||
			(line.salesItem?.id ? `Item ${line.salesItem.id}` : null),
		orderedQty,
		allocatedQty,
		pendingReviewQty,
		pickedQty,
		shippedQty,
		remainingQty,
		backorderedQty,
		inboundQty,
		receivedQty,
		status: deriveLineStatus(orderedQty, shippedQty, remainingQty, components),
		components,
	};
}

function incrementStatusCount(
	counts: Record<SalesFulfillmentStatus, number>,
	status: SalesFulfillmentStatus,
) {
	counts[status] = (counts[status] || 0) + 1;
}

function incrementProductionReadinessCount(
	counts: Record<SalesProductionReadiness, number>,
	status: SalesProductionReadiness,
) {
	counts[status] = (counts[status] || 0) + 1;
}

function incrementProductionStockStatusCount(
	counts: Record<SalesProductionStockStatus, number>,
	status: SalesProductionStockStatus,
) {
	counts[status] = (counts[status] || 0) + 1;
}

function derivePlanStatus(
	lines: SalesFulfillmentLineProjection[],
): SalesFulfillmentStatus {
	if (!lines.length) return "not_fulfilled";
	if (lines.every((line) => line.status === "fulfilled")) return "fulfilled";
	if (lines.some((line) => line.status === "awaiting_inbound")) {
		return "awaiting_inbound";
	}
	if (lines.some((line) => line.status === "backordered")) return "backordered";
	if (lines.some((line) => line.status === "ready_to_ship_remaining")) {
		return "ready_to_ship_remaining";
	}
	if (lines.some((line) => line.shippedQty > 0 || line.pickedQty > 0)) {
		return "partially_fulfilled";
	}
	return "not_fulfilled";
}

export function summarizeSalesFulfillmentPlan(
	lineItems: FulfillmentLineLike[],
): SalesFulfillmentPlan {
	const lines = lineItems.map(summarizeLine);
	const statusCounts: Record<SalesFulfillmentStatus, number> = {
		not_fulfilled: 0,
		partially_fulfilled: 0,
		backordered: 0,
		awaiting_inbound: 0,
		ready_to_ship_remaining: 0,
		fulfilled: 0,
	};

	for (const line of lines) {
		incrementStatusCount(statusCounts, line.status);
	}

	return {
		summary: {
			lineCount: lines.length,
			componentCount: sumBy(lines, (line) => line.components.length),
			orderedQty: sumBy(lines, (line) => line.orderedQty),
			allocatedQty: sumBy(lines, (line) => line.allocatedQty),
			pendingReviewQty: sumBy(lines, (line) => line.pendingReviewQty),
			pickedQty: sumBy(lines, (line) => line.pickedQty),
			shippedQty: sumBy(lines, (line) => line.shippedQty),
			remainingQty: sumBy(lines, (line) => line.remainingQty),
			backorderedQty: sumBy(lines, (line) => line.backorderedQty),
			inboundQty: sumBy(lines, (line) => line.inboundQty),
			receivedQty: sumBy(lines, (line) => line.receivedQty),
			status: derivePlanStatus(lines),
			statusCounts,
		},
		lines,
	};
}

function isBackorderQueueStatus(
	status: SalesFulfillmentStatus,
): status is SalesBackorderQueueStatus {
	return (
		status === "awaiting_inbound" ||
		status === "backordered" ||
		status === "ready_to_ship_remaining"
	);
}

function getCustomerName(line: SalesBackorderQueueLineLike) {
	return line.sale?.customer?.businessName || line.sale?.customer?.name || null;
}

function getBlockerComponents(line: SalesFulfillmentLineProjection) {
	return line.components.filter(
		(component) =>
			component.status === "awaiting_inbound" ||
			component.status === "backordered" ||
			component.backorderedQty > 0 ||
			(component.inboundQty > 0 && component.receivedQty < component.inboundQty),
	);
}

export function buildSalesBackorderQueue(
	lineItems: SalesBackorderQueueLineLike[],
	input: Pick<GetSalesBackorderQueueInput, "statuses" | "limit"> = {},
): SalesBackorderQueue {
	const requestedStatuses =
		input.statuses?.length ? input.statuses : DEFAULT_BACKORDER_QUEUE_STATUSES;
	const allowedStatuses = new Set<SalesFulfillmentStatus>(requestedStatuses);
	const limit = Math.min(Math.max(input.limit || 50, 1), 200);
	const items: SalesBackorderQueueItem[] = [];

	for (const sourceLine of lineItems) {
		const line = summarizeSalesFulfillmentPlan([sourceLine]).lines[0];
		if (!line || !isBackorderQueueStatus(line.status)) continue;
		if (!allowedStatuses.has(line.status)) continue;

		items.push({
			salesOrderId: sourceLine.sale?.id ?? sourceLine.saleId ?? null,
			orderId: sourceLine.sale?.orderId ?? null,
			orderStatus: sourceLine.sale?.status ?? null,
			inventoryStatus: sourceLine.sale?.inventoryStatus ?? null,
			prodStatus: sourceLine.sale?.prodStatus ?? null,
			customerName: getCustomerName(sourceLine),
			lineItemId: line.id,
			salesItemId: sourceLine.salesItem?.id ?? null,
			uid: line.uid,
			title: line.title,
			status: line.status,
			orderedQty: line.orderedQty,
			allocatedQty: line.allocatedQty,
			pendingReviewQty: line.pendingReviewQty,
			pickedQty: line.pickedQty,
			shippedQty: line.shippedQty,
			remainingQty: line.remainingQty,
			backorderedQty: line.backorderedQty,
			inboundQty: line.inboundQty,
			receivedQty: line.receivedQty,
			blockerComponents: getBlockerComponents(line),
		});
	}

	const slicedItems = items.slice(0, limit);
	const statusCounts: Record<SalesBackorderQueueStatus, number> = {
		awaiting_inbound: 0,
		backordered: 0,
		ready_to_ship_remaining: 0,
	};

	for (const item of slicedItems) {
		statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
	}

	return {
		summary: {
			totalCount: slicedItems.length,
			statusCounts,
			orderedQty: sumBy(slicedItems, (item) => item.orderedQty),
			shippedQty: sumBy(slicedItems, (item) => item.shippedQty),
			remainingQty: sumBy(slicedItems, (item) => item.remainingQty),
			backorderedQty: sumBy(slicedItems, (item) => item.backorderedQty),
			inboundQty: sumBy(slicedItems, (item) => item.inboundQty),
			receivedQty: sumBy(slicedItems, (item) => item.receivedQty),
		},
		items: slicedItems,
		nextCursorId:
			items.length > limit ? (slicedItems.at(-1)?.lineItemId ?? null) : null,
	};
}

function getProductionStockStatus(
	component: SalesFulfillmentComponentProjection,
): SalesProductionStockStatus {
	if (component.orderedQty > 0 && component.shippedQty >= component.orderedQty) {
		return "fulfilled";
	}
	if (component.allocatedQty >= component.orderedQty) return "allocated";
	if (
		component.pendingReviewQty > 0 &&
		component.allocatedQty + component.pendingReviewQty >= component.orderedQty
	) {
		return "pending_review";
	}
	if (
		component.receivedQty > 0 &&
		component.allocatedQty + component.receivedQty >= component.orderedQty
	) {
		return "ready_after_receive";
	}
	if (component.receivedQty > 0) return "partially_received";
	if (component.inboundQty > component.receivedQty) return "awaiting_inbound";
	return "shortage";
}

function getComponentProductionReadiness(
	stockStatus: SalesProductionStockStatus,
): SalesProductionReadiness {
	if (stockStatus === "fulfilled") return "fulfilled";
	if (stockStatus === "allocated") return "ready_for_production";
	if (stockStatus === "pending_review") return "allocation_review";
	if (
		stockStatus === "awaiting_inbound" ||
		stockStatus === "partially_received" ||
		stockStatus === "ready_after_receive"
	) {
		return "awaiting_inbound";
	}
	return "blocked";
}

function deriveProductionReadiness(
	readinesses: SalesProductionReadiness[],
): SalesProductionReadiness {
	if (!readinesses.length) return "blocked";
	if (readinesses.every((status) => status === "fulfilled")) return "fulfilled";
	if (
		readinesses.every(
			(status) =>
				status === "ready_for_production" || status === "fulfilled",
		)
	) {
		return "ready_for_production";
	}
	if (readinesses.some((status) => status === "awaiting_inbound")) {
		return "awaiting_inbound";
	}
	if (readinesses.some((status) => status === "allocation_review")) {
		return "allocation_review";
	}
	return "blocked";
}

function getProductionComponents(
	line: SalesFulfillmentLineProjection,
): SalesFulfillmentComponentProjection[] {
	const requiredComponents = line.components.filter((component) => component.required);
	return requiredComponents.length ? requiredComponents : line.components;
}

function buildProductionGroup(
	key: string,
	label: string,
	components: SalesProductionPlanComponent[],
	extra: Partial<
		Pick<
			SalesProductionPlanGroup,
			| "salesOrderId"
			| "lineItemId"
			| "componentId"
			| "inventoryVariantId"
			| "supplierId"
			| "stockStatus"
		>
	> = {},
): SalesProductionPlanGroup {
	return {
		key,
		label,
		...extra,
		componentCount: components.length,
		lineCount: new Set(components.map((component) => component.lineItemId)).size,
		orderedQty: sumBy(components, (component) => component.orderedQty),
		allocatedQty: sumBy(components, (component) => component.allocatedQty),
		pendingReviewQty: sumBy(
			components,
			(component) => component.pendingReviewQty,
		),
		backorderedQty: sumBy(components, (component) => component.backorderedQty),
		inboundQty: sumBy(components, (component) => component.inboundQty),
		receivedQty: sumBy(components, (component) => component.receivedQty),
		readiness: deriveProductionReadiness(
			components.map((component) => component.readiness),
		),
	};
}

function groupProductionComponents(
	components: SalesProductionPlanComponent[],
	readGroup: (component: SalesProductionPlanComponent) => {
		key: string;
		label: string;
		extra?: Partial<
			Pick<
				SalesProductionPlanGroup,
				| "salesOrderId"
				| "lineItemId"
				| "componentId"
				| "inventoryVariantId"
				| "supplierId"
				| "stockStatus"
			>
		>;
	},
) {
	const groups = new Map<
		string,
		{
			label: string;
			components: SalesProductionPlanComponent[];
			extra?: Partial<
				Pick<
					SalesProductionPlanGroup,
					| "salesOrderId"
					| "lineItemId"
					| "componentId"
					| "inventoryVariantId"
					| "supplierId"
					| "stockStatus"
				>
			>;
		}
	>();

	for (const component of components) {
		const group = readGroup(component);
		const current = groups.get(group.key) || {
			label: group.label,
			components: [],
			extra: group.extra,
		};
		current.components.push(component);
		groups.set(group.key, current);
	}

	return Array.from(groups.entries()).map(([key, group]) =>
		buildProductionGroup(key, group.label, group.components, group.extra),
	);
}

export function buildSalesProductionPlan(
	lineItems: SalesProductionPlanLineLike[],
	input: Pick<GetSalesProductionPlanInput, "readinesses" | "limit"> = {},
): SalesProductionPlan {
	const limit = Math.min(Math.max(input.limit || 100, 1), 500);
	const requestedReadinesses = input.readinesses?.length
		? new Set<SalesProductionReadiness>(input.readinesses)
		: null;
	const components: SalesProductionPlanComponent[] = [];

	for (const sourceLine of lineItems) {
		const line = summarizeSalesFulfillmentPlan([sourceLine]).lines[0];
		if (!line) continue;

		const productionComponents = getProductionComponents(line);
		const componentReadinesses = productionComponents.map((component) =>
			getComponentProductionReadiness(getProductionStockStatus(component)),
		);
		const lineReadiness = deriveProductionReadiness(componentReadinesses);

		for (const component of productionComponents) {
			const stockStatus = getProductionStockStatus(component);
			const readiness = getComponentProductionReadiness(stockStatus);
			if (requestedReadinesses && !requestedReadinesses.has(readiness)) {
				continue;
			}

			components.push({
				salesOrderId: sourceLine.sale?.id ?? sourceLine.saleId ?? null,
				orderId: sourceLine.sale?.orderId ?? null,
				customerName: getCustomerName(sourceLine),
				lineItemId: line.id,
				salesItemId: sourceLine.salesItem?.id ?? null,
				lineTitle: line.title,
				componentId: component.id,
				componentName: component.componentName,
				inventoryId: component.inventoryId,
				inventoryVariantId: component.inventoryVariantId,
				inventoryCategoryId: component.inventoryCategoryId,
				inventoryVariantSku: component.inventoryVariantSku,
				supplierId: component.supplierId,
				supplierName: component.supplierName,
				required: component.required,
				orderedQty: component.orderedQty,
				allocatedQty: component.allocatedQty,
				pendingReviewQty: component.pendingReviewQty,
				pickedQty: component.pickedQty,
				shippedQty: component.shippedQty,
				remainingQty: component.remainingQty,
				backorderedQty: component.backorderedQty,
				inboundQty: component.inboundQty,
				receivedQty: component.receivedQty,
				stockStatus,
				readiness,
				lineReadiness,
			});

			if (components.length >= limit) break;
		}
		if (components.length >= limit) break;
	}

	const readinessCounts: Record<SalesProductionReadiness, number> = {
		ready_for_production: 0,
		fulfilled: 0,
		awaiting_inbound: 0,
		allocation_review: 0,
		blocked: 0,
	};
	const stockStatusCounts: Record<SalesProductionStockStatus, number> = {
		allocated: 0,
		pending_review: 0,
		awaiting_inbound: 0,
		partially_received: 0,
		ready_after_receive: 0,
		shortage: 0,
		fulfilled: 0,
	};

	for (const component of components) {
		incrementProductionReadinessCount(readinessCounts, component.readiness);
		incrementProductionStockStatusCount(stockStatusCounts, component.stockStatus);
	}

	const visibleLineReadinesses = Array.from(
		new Map(
			components.map((component) => [
				String(component.lineItemId ?? component.lineTitle),
				component.lineReadiness,
			]),
		).values(),
	);
	const supplierIds = new Set(
		components
			.map((component) => component.supplierId)
			.filter((supplierId): supplierId is number => supplierId != null),
	);

	return {
		summary: {
			lineCount: visibleLineReadinesses.length,
			componentCount: components.length,
			readyLineCount: visibleLineReadinesses.filter(
				(status) =>
					status === "ready_for_production" || status === "fulfilled",
			).length,
			blockedLineCount: visibleLineReadinesses.filter(
				(status) =>
					status !== "ready_for_production" && status !== "fulfilled",
			).length,
			supplierCount: supplierIds.size,
			orderedQty: sumBy(components, (component) => component.orderedQty),
			allocatedQty: sumBy(components, (component) => component.allocatedQty),
			pendingReviewQty: sumBy(
				components,
				(component) => component.pendingReviewQty,
			),
			pickedQty: sumBy(components, (component) => component.pickedQty),
			shippedQty: sumBy(components, (component) => component.shippedQty),
			remainingQty: sumBy(components, (component) => component.remainingQty),
			backorderedQty: sumBy(components, (component) => component.backorderedQty),
			inboundQty: sumBy(components, (component) => component.inboundQty),
			receivedQty: sumBy(components, (component) => component.receivedQty),
			readiness: deriveProductionReadiness(visibleLineReadinesses),
			readinessCounts,
			stockStatusCounts,
		},
		components,
		groups: {
			bySale: groupProductionComponents(components, (component) => ({
				key: String(component.salesOrderId ?? component.orderId ?? "unknown"),
				label: component.orderId || "Unknown sale",
				extra: {
					salesOrderId: component.salesOrderId,
				},
			})),
			bySalesItem: groupProductionComponents(components, (component) => ({
				key: String(component.lineItemId ?? component.salesItemId ?? "unknown"),
				label: component.lineTitle || "Untitled line item",
				extra: {
					lineItemId: component.lineItemId,
				},
			})),
			byComponent: groupProductionComponents(components, (component) => ({
				key: String(
					component.inventoryVariantId ??
						component.componentId ??
						component.componentName ??
						"unknown",
				),
				label: component.componentName || "Unknown component",
				extra: {
					componentId: component.componentId,
					inventoryVariantId: component.inventoryVariantId,
				},
			})),
			bySupplier: groupProductionComponents(components, (component) => ({
				key: String(component.supplierId ?? "unassigned"),
				label: component.supplierName || "Unassigned supplier",
				extra: {
					supplierId: component.supplierId,
				},
			})),
			byStockStatus: groupProductionComponents(components, (component) => ({
				key: component.stockStatus,
				label: component.stockStatus.replaceAll("_", " "),
				extra: {
					stockStatus: component.stockStatus,
				},
			})),
		},
	};
}

export async function getSalesBackorderQueue(
	db: Db,
	input: GetSalesBackorderQueueInput = {},
): Promise<SalesBackorderQueue> {
	const limit = Math.min(Math.max(input.limit || 50, 1), 200);
	const candidateTake = Math.min(limit * 3, 300);
	const lineItems = await db.lineItem.findMany({
		where: {
			deletedAt: null,
			lineItemType: "SALE",
			id: input.cursorId
				? {
						gt: input.cursorId,
					}
				: undefined,
			saleId: input.salesOrderId || undefined,
			sale: {
				deletedAt: null,
			},
			...(input.inventoryVariantId
				? {
						components: {
							some: {
								inventoryVariantId: input.inventoryVariantId,
							},
						},
					}
				: {}),
			OR: [
				{
					components: {
						some: {
							status: {
								in: [
									"pending",
									"partially_allocated",
									"inbound_required",
									"partially_received",
								],
							},
						},
					},
				},
				{
					components: {
						some: {
							inboundDemands: {
								some: {
									deletedAt: null,
									status: {
										not: "cancelled",
									},
								},
							},
						},
					},
				},
				{
					salesItem: {
						itemDeliveries: {
							some: {
								deletedAt: null,
								packingStatus: "packed",
							},
						},
					},
				},
			],
		},
		orderBy: {
			id: "asc",
		},
		take: candidateTake,
		select: {
			id: true,
			uid: true,
			title: true,
			qty: true,
			saleId: true,
			sale: {
				select: {
					id: true,
					orderId: true,
					status: true,
					inventoryStatus: true,
					prodStatus: true,
					customer: {
						select: {
							name: true,
							businessName: true,
						},
					},
				},
			},
			salesItem: {
				select: {
					id: true,
					description: true,
					qty: true,
					itemDeliveries: {
						where: {
							deletedAt: null,
							packingStatus: "packed",
						},
						select: {
							qty: true,
							packingStatus: true,
							status: true,
							delivery: {
								select: {
									status: true,
									deliveredAt: true,
								},
							},
						},
					},
				},
			},
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
					inventoryId: true,
					inventoryVariantId: true,
					inventoryCategoryId: true,
					subComponentId: true,
					inventory: {
						select: {
							id: true,
							name: true,
							productKind: true,
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
							description: true,
						},
					},
					inventoryCategory: {
						select: {
							id: true,
							title: true,
							productKind: true,
						},
					},
					subComponent: {
						select: {
							id: true,
							inventoryCategory: {
								select: {
									id: true,
									title: true,
								},
							},
							defaultInventory: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
					stockAllocations: {
						where: {
							deletedAt: null,
							status: {
								not: "cancelled",
							},
						},
						select: {
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
							qty: true,
							qtyReceived: true,
							status: true,
						},
					},
				},
			},
		},
	});

	return buildSalesBackorderQueue(lineItems, {
		statuses: input.statuses,
		limit,
	});
}

export async function getSalesProductionPlan(
	db: Db,
	input: GetSalesProductionPlanInput = {},
): Promise<SalesProductionPlan> {
	const limit = Math.min(Math.max(input.limit || 100, 1), 500);
	const candidateTake = Math.min(limit * 2, 500);
	const lineItems = await db.lineItem.findMany({
		where: {
			deletedAt: null,
			lineItemType: "SALE",
			saleId: input.salesOrderId || undefined,
			sale: {
				deletedAt: null,
			},
			components: {
				some: {
					status: {
						not: "cancelled",
					},
					inventoryVariantId: input.inventoryVariantId || undefined,
					...(input.supplierId
						? {
								inventory: {
									defaultSupplierId: input.supplierId,
								},
							}
						: {}),
				},
			},
		},
		orderBy: {
			id: "asc",
		},
		take: candidateTake,
		select: {
			id: true,
			uid: true,
			title: true,
			qty: true,
			saleId: true,
			sale: {
				select: {
					id: true,
					orderId: true,
					status: true,
					inventoryStatus: true,
					prodStatus: true,
					customer: {
						select: {
							name: true,
							businessName: true,
						},
					},
				},
			},
			salesItem: {
				select: {
					id: true,
					description: true,
					qty: true,
					itemDeliveries: {
						where: {
							deletedAt: null,
						},
						select: {
							qty: true,
							packingStatus: true,
							status: true,
							delivery: {
								select: {
									status: true,
									deliveredAt: true,
								},
							},
						},
					},
				},
			},
			components: {
				where: {
					status: {
						not: "cancelled",
					},
					inventoryVariantId: input.inventoryVariantId || undefined,
					...(input.supplierId
						? {
								inventory: {
									defaultSupplierId: input.supplierId,
								},
							}
						: {}),
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
					subComponentId: true,
					inventory: {
						select: {
							id: true,
							name: true,
							productKind: true,
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
							description: true,
						},
					},
					inventoryCategory: {
						select: {
							id: true,
							title: true,
							productKind: true,
						},
					},
					subComponent: {
						select: {
							id: true,
							inventoryCategory: {
								select: {
									id: true,
									title: true,
								},
							},
							defaultInventory: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
					stockAllocations: {
						where: {
							deletedAt: null,
							status: {
								not: "cancelled",
							},
						},
						select: {
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
							qty: true,
							qtyReceived: true,
							status: true,
						},
					},
				},
			},
		},
	});

	return buildSalesProductionPlan(lineItems, {
		readinesses: input.readinesses,
		limit,
	});
}

export async function getSalesFulfillmentPlan(
	db: Db,
	input: GetSalesFulfillmentPlanInput,
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
			customer: {
				select: {
					name: true,
					businessName: true,
				},
			},
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
					title: true,
					qty: true,
					salesItem: {
						select: {
							id: true,
							description: true,
							qty: true,
							itemDeliveries: {
								where: {
									deletedAt: null,
								},
								select: {
									id: true,
									qty: true,
									status: true,
									packingStatus: true,
									delivery: {
										select: {
											id: true,
											status: true,
											deliveredAt: true,
										},
									},
								},
							},
						},
					},
					components: {
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
							subComponentId: true,
							inventory: {
								select: {
									id: true,
									name: true,
									productKind: true,
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
									description: true,
								},
							},
							inventoryCategory: {
								select: {
									id: true,
									title: true,
									productKind: true,
								},
							},
							subComponent: {
								select: {
									id: true,
									inventoryCategory: {
										select: {
											id: true,
											title: true,
										},
									},
									defaultInventory: {
										select: {
											id: true,
											name: true,
										},
									},
								},
							},
							stockAllocations: {
								where: {
									deletedAt: null,
									status: {
										not: "cancelled",
									},
								},
								select: {
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
									qty: true,
									qtyReceived: true,
									status: true,
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
		fulfillment: summarizeSalesFulfillmentPlan(sale.lineItems),
	};
}

async function consumeComponentAllocations(
	db: DbLike,
	input: {
		lineItemComponentId: number;
		consumeQty: number;
		note?: string | null;
	},
) {
	let remaining = roundQuantity(input.consumeQty);
	let consumedQty = 0;
	const allocations = await db.stockAllocation.findMany({
		where: {
			lineItemComponentId: input.lineItemComponentId,
			deletedAt: null,
			status: {
				in: ["approved", "reserved", "picked"],
			},
		},
		orderBy: {
			id: "asc",
		},
		select: {
			id: true,
			qty: true,
			status: true,
			inventoryStockId: true,
			inventoryVariantId: true,
			lineItemComponentId: true,
			notes: true,
		},
	});

	for (const allocation of allocations) {
		if (remaining <= 0) break;

		const allocationQty = numberValue(allocation.qty);
		if (allocationQty <= 0) continue;

		const takeQty = roundQuantity(Math.min(allocationQty, remaining));
		const residualQty = roundQuantity(allocationQty - takeQty);

		if (residualQty <= 0) {
			await db.stockAllocation.update({
				where: {
					id: allocation.id,
				},
				data: {
					status: "consumed",
					notes: input.note || allocation.notes,
				},
			});
		} else {
			await db.stockAllocation.update({
				where: {
					id: allocation.id,
				},
				data: {
					qty: residualQty,
				},
			});
			await db.stockAllocation.create({
				data: {
					lineItemComponentId: allocation.lineItemComponentId,
					inventoryStockId: allocation.inventoryStockId,
					inventoryVariantId: allocation.inventoryVariantId,
					qty: takeQty,
					status: "consumed",
					notes: input.note || allocation.notes,
				},
			});
		}

		remaining = roundQuantity(remaining - takeQty);
		consumedQty = roundQuantity(consumedQty + takeQty);
	}

	return {
		consumedQty,
	};
}

async function ensureBackorderInboundDemand(
	db: DbLike,
	input: {
		lineItemComponentId: number;
		inventoryVariantId: number | null;
		backorderedQty: number;
		note?: string | null;
	},
) {
	if (!input.inventoryVariantId || input.backorderedQty <= 0) {
		return {
			createdQty: 0,
		};
	}

	const existingDemands = await db.inboundDemand.findMany({
		where: {
			lineItemComponentId: input.lineItemComponentId,
			deletedAt: null,
			status: {
				not: "cancelled",
			},
		},
		select: {
			qty: true,
			qtyReceived: true,
		},
	});
	const openDemandQty = sumBy(existingDemands, (demand) =>
		Math.max(0, numberValue(demand.qty) - numberValue(demand.qtyReceived)),
	);
	const missingDemandQty = roundQuantity(
		Math.max(0, input.backorderedQty - openDemandQty),
	);

	if (missingDemandQty <= 0) {
		return {
			createdQty: 0,
		};
	}

	await db.inboundDemand.create({
		data: {
			lineItemComponentId: input.lineItemComponentId,
			inventoryVariantId: input.inventoryVariantId,
			qty: missingDemandQty,
			status: "pending",
			notes: input.note || "Created from partial inventory shipment.",
		},
	});

	return {
		createdQty: missingDemandQty,
	};
}

async function recomputeLineItemComponentFulfillment(
	db: DbLike,
	lineItemComponentId: number,
) {
	const component = await db.lineItemComponents.findUnique({
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

	if (!component) return null;

	const qtyRequired = numberValue(component.qty);
	const qtyAllocated = sumBy(component.stockAllocations, (allocation) =>
		numberValue(allocation.qty),
	);
	const qtyInbound = sumBy(component.inboundDemands, (demand) =>
		numberValue(demand.qty),
	);
	const qtyReceived = sumBy(component.inboundDemands, (demand) =>
		numberValue(demand.qtyReceived),
	);

	let status: any = "pending";
	if (qtyRequired <= 0) {
		status = "cancelled";
	} else if (qtyReceived > 0 && qtyReceived < qtyInbound) {
		status = "partially_received";
	} else if (qtyReceived >= qtyInbound && qtyInbound > 0) {
		status =
			qtyAllocated + qtyReceived >= qtyRequired
				? "fulfilled"
				: "partially_received";
	} else if (qtyAllocated >= qtyRequired && qtyInbound <= 0) {
		status = "allocated";
	} else if (qtyAllocated > 0 && qtyInbound > 0) {
		status = "partially_allocated";
	} else if (qtyInbound > 0) {
		status = "inbound_required";
	}

	return db.lineItemComponents.update({
		where: {
			id: component.id,
		},
		data: {
			qtyAllocated,
			qtyInbound,
			qtyReceived,
			status,
		},
	});
}

async function getAvailableStockRows(
	db: DbLike,
	inventoryVariantId: number,
) {
	const stockRows = await db.inventoryStock.findMany({
		where: {
			inventoryVariantId,
			deletedAt: null,
		},
		orderBy: {
			createdAt: "asc",
		},
		select: {
			id: true,
			qty: true,
		},
	});
	const allocations = await db.stockAllocation.findMany({
		where: {
			inventoryVariantId,
			deletedAt: null,
			status: {
				in: ["approved", "reserved", "picked", "consumed"],
			},
			inventoryStockId: {
				not: null,
			},
		},
		select: {
			inventoryStockId: true,
			qty: true,
		},
	});
	const reservedByStockId = new Map<number, number>();
	for (const allocation of allocations) {
		if (!allocation.inventoryStockId) continue;
		reservedByStockId.set(
			allocation.inventoryStockId,
			roundQuantity(
				(reservedByStockId.get(allocation.inventoryStockId) || 0) +
					numberValue(allocation.qty),
			),
		);
	}

	return stockRows
		.map((stock) => ({
			id: stock.id,
			availableQty: roundQuantity(
				Math.max(0, numberValue(stock.qty) - (reservedByStockId.get(stock.id) || 0)),
			),
		}))
		.filter((stock) => stock.availableQty > 0);
}

async function reserveAvailableStockForComponent(
	db: DbLike,
	input: {
		lineItemComponentId: number;
		inventoryVariantId: number;
		qty: number;
		note?: string | null;
	},
) {
	let remaining = roundQuantity(input.qty);
	let reservedQty = 0;
	const allocations: AllocateReceivedInboundToBackordersResult["allocations"] = [];
	const stockRows = await getAvailableStockRows(db, input.inventoryVariantId);

	for (const stock of stockRows) {
		if (remaining <= 0) break;
		const qty = roundQuantity(Math.min(remaining, stock.availableQty));
		if (qty <= 0) continue;

		await db.stockAllocation.create({
			data: {
				lineItemComponentId: input.lineItemComponentId,
				inventoryVariantId: input.inventoryVariantId,
				inventoryStockId: stock.id,
				qty,
				status: "reserved",
				notes: input.note || "Reserved from received inbound stock.",
			},
		});

		allocations.push({
			lineItemComponentId: input.lineItemComponentId,
			inventoryVariantId: input.inventoryVariantId,
			inventoryStockId: stock.id,
			qty,
		});
		reservedQty = roundQuantity(reservedQty + qty);
		remaining = roundQuantity(remaining - qty);
	}

	return {
		reservedQty,
		allocations,
	};
}

export async function allocateReceivedInboundToBackorders(
	db: Db,
	input: AllocateReceivedInboundToBackordersInput = {},
): Promise<AllocateReceivedInboundToBackordersResult> {
	const limit = Math.min(Math.max(input.limit || 50, 1), 200);

	return db.$transaction(async (tx) => {
		const demands = await tx.inboundDemand.findMany({
			where: {
				deletedAt: null,
				status: {
					in: ["partially_received", "received"],
				},
				qtyReceived: {
					gt: 0,
				},
				inventoryVariantId: input.inventoryVariantId || undefined,
				lineItemComponentId: input.lineItemComponentIds?.length
					? {
							in: input.lineItemComponentIds,
						}
					: undefined,
				lineItemComponent: input.salesOrderId
					? {
							parent: {
								saleId: input.salesOrderId,
							},
						}
					: undefined,
			},
			orderBy: {
				updatedAt: "asc",
			},
			take: limit,
			select: {
				id: true,
				qty: true,
				qtyReceived: true,
				inventoryVariantId: true,
				lineItemComponentId: true,
			},
		});

		const touchedComponentIds = new Set<number>();
		const allocations: AllocateReceivedInboundToBackordersResult["allocations"] = [];
		let allocatedQty = 0;
		let remainingBackorderQty = 0;

		for (const demand of demands) {
			const component = await tx.lineItemComponents.findUnique({
				where: {
					id: demand.lineItemComponentId,
				},
				select: {
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
				},
			});
			if (!component) continue;

			const availableStockRows = await getAvailableStockRows(
				tx,
				demand.inventoryVariantId,
			);
			const availableStockQty = sumBy(
				availableStockRows,
				(stock) => stock.availableQty,
			);
			const allocatedComponentQty = sumBy(
				component.stockAllocations,
				(allocation) => numberValue(allocation.qty),
			);
			const plan = planReceivedBackorderAllocation({
				requiredQty: component.qty,
				allocatedQty: allocatedComponentQty,
				receivedQty: demand.qtyReceived,
				availableStockQty,
			});

			remainingBackorderQty = roundQuantity(
				remainingBackorderQty + plan.remainingBackorderQty,
			);
			if (plan.reserveQty <= 0) continue;

			const reserved = await reserveAvailableStockForComponent(tx, {
				lineItemComponentId: demand.lineItemComponentId,
				inventoryVariantId: demand.inventoryVariantId,
				qty: plan.reserveQty,
				note: input.note || "Reserved from received inbound demand.",
			});

			if (reserved.reservedQty <= 0) continue;

			allocatedQty = roundQuantity(allocatedQty + reserved.reservedQty);
			allocations.push(...reserved.allocations);
			touchedComponentIds.add(demand.lineItemComponentId);

			await recomputeLineItemComponentFulfillment(
				tx,
				demand.lineItemComponentId,
			);
		}

		return {
			ok: allocatedQty > 0,
			processedDemandCount: demands.length,
			touchedComponentCount: touchedComponentIds.size,
			allocatedQty,
			remainingBackorderQty,
			allocations,
		};
	});
}

export async function shipAvailableSalesInventory(
	db: Db,
	input: ShipAvailableSalesInventoryInput,
): Promise<ShipAvailableSalesInventoryResult> {
	const lineItemFilter = input.lineItemIds?.length
		? {
				id: {
					in: input.lineItemIds,
				},
			}
		: {};

	return db.$transaction(async (tx) => {
		const sale = await tx.salesOrders.findFirst({
			where: {
				id: input.salesOrderId,
				deletedAt: null,
			},
			select: {
				id: true,
				orderId: true,
				deliveryOption: true,
				lineItems: {
					where: {
						deletedAt: null,
						lineItemType: "SALE",
						...lineItemFilter,
					},
					select: {
						id: true,
						qty: true,
						salesItemId: true,
						salesItem: {
							select: {
								id: true,
								qty: true,
								itemDeliveries: {
									where: {
										deletedAt: null,
										packingStatus: "packed",
										delivery: {
											status: {
												in: ["completed", "delivered"],
											},
										},
									},
									select: {
										qty: true,
									},
								},
							},
						},
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
								inventoryVariantId: true,
								stockAllocations: {
									where: {
										deletedAt: null,
										status: {
											in: ["approved", "reserved", "picked"],
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
						},
					},
				},
			},
		});

		if (!sale) {
			throw new Error("SALES_ORDER_NOT_FOUND");
		}

		const plannedLines = sale.lineItems
			.filter((line) => line.salesItemId && line.salesItem)
			.map((line) => {
				const alreadyShippedQty = sumBy(
					line.salesItem?.itemDeliveries,
					(delivery) => numberValue(delivery.qty),
				);
				const plan = planAvailableShipmentForLine({
					orderedQty: line.qty ?? line.salesItem?.qty ?? 0,
					alreadyShippedQty,
					components: line.components.map((component) => ({
						componentId: component.id,
						required: component.required,
						orderedQty: component.qty,
						availableQty: sumBy(component.stockAllocations, (allocation) =>
							numberValue(allocation.qty),
						),
						inboundQty: sumBy(component.inboundDemands, (demand) =>
							numberValue(demand.qty),
						),
						receivedQty: sumBy(component.inboundDemands, (demand) =>
							numberValue(demand.qtyReceived),
						),
						inventoryVariantId: component.inventoryVariantId,
					})),
				});

				return {
					line,
					plan,
				};
			})
			.filter(({ plan }) => plan.shipQty > 0 || plan.backorderedQty > 0);

		const shippableLines = plannedLines.filter(({ plan }) => plan.shipQty > 0);
		let deliveryId: number | null = null;
		let consumedAllocationQty = 0;
		let inboundDemandCreatedQty = 0;

		if (shippableLines.length) {
			const delivery = await tx.orderDelivery.create({
				data: {
					salesOrderId: sale.id,
					deliveryMode:
						input.deliveryMode || sale.deliveryOption || "inventory_partial",
					deliveredTo: input.deliveredTo || null,
					createdById: input.createdByUserId || null,
					status: "completed",
					deliveredAt: new Date(),
					meta: {
						source: "inventory_partial_shipment",
						orderId: sale.orderId,
						note: input.note || null,
					},
				},
				select: {
					id: true,
				},
			});
			deliveryId = delivery.id;

			await tx.orderItemDelivery.createMany({
				data: shippableLines.map(({ line, plan }) => ({
					orderId: sale.id,
					orderItemId: line.salesItemId!,
					orderDeliveryId: delivery.id,
					qty: plan.shipQty,
					status: "completed",
					packingStatus: "packed",
					packedBy: input.authorName || "Inventory",
					note: input.note || null,
					meta: {
						source: "inventory_partial_shipment",
						lineItemId: line.id,
						backorderedQty: plan.backorderedQty,
					},
				})),
			});
		}

		for (const { plan } of plannedLines) {
			for (const componentPlan of plan.components) {
				if (componentPlan.consumeQty > 0) {
					const consumed = await consumeComponentAllocations(tx, {
						lineItemComponentId: componentPlan.componentId,
						consumeQty: componentPlan.consumeQty,
						note: input.note || "Consumed by inventory partial shipment.",
					});
					consumedAllocationQty = roundQuantity(
						consumedAllocationQty + consumed.consumedQty,
					);
				}

				if (componentPlan.backorderedQty > 0) {
					const inboundDemand = await ensureBackorderInboundDemand(tx, {
						lineItemComponentId: componentPlan.componentId,
						inventoryVariantId: componentPlan.inventoryVariantId,
						backorderedQty: componentPlan.backorderedQty,
						note: input.note || "Backorder demand from partial shipment.",
					});
					inboundDemandCreatedQty = roundQuantity(
						inboundDemandCreatedQty + inboundDemand.createdQty,
					);
				}

				await recomputeLineItemComponentFulfillment(
					tx,
					componentPlan.componentId,
				);
			}
		}

		const shippedQty = sumBy(shippableLines, ({ plan }) => plan.shipQty);
		const backorderedQty = sumBy(plannedLines, ({ plan }) => plan.backorderedQty);

		if (shippedQty > 0 || backorderedQty > 0) {
			await tx.salesOrders.update({
				where: {
					id: sale.id,
				},
				data: {
					inventoryStatus:
						backorderedQty > 0 ? "backordered" : "partially_fulfilled",
				},
			});
		}

		return {
			ok: shippedQty > 0,
			salesOrderId: sale.id,
			deliveryId,
			shippedLineCount: shippableLines.length,
			shippedQty,
			backorderedQty,
			consumedAllocationQty,
			inboundDemandCreatedQty,
			lines: shippableLines.map(({ line, plan }) => ({
				lineItemId: line.id,
				salesItemId: line.salesItemId!,
				shipQty: plan.shipQty,
				backorderedQty: plan.backorderedQty,
			})),
		};
	});
}
