import type { Db } from "@gnd/db";

import {
	type SalesOrderLifecycleStatus,
	getSalesOrderLifecycleStatusInfo,
} from "./order-status";
import {
	type SalesInventoryRequirementDisplayStatus,
	hasPassedInventoryTrackingRepairBoundary,
	resolveSalesInventoryFulfillmentStatus,
	resolveSalesInventoryOperationPolicy,
	resolveSalesInventoryOverviewSetupMode,
	resolveSalesInventoryRequirementDisplay,
} from "./sales-inventory-policy";
import { roundMoney } from "./payment-system/domain/money";
export {
	hasPassedInventoryTrackingRepairBoundary,
	resolveSalesInventoryFulfillmentStatus,
	resolveSalesInventoryOperationPolicy,
	resolveSalesInventoryOverviewSetupMode,
	resolveSalesInventoryRequirementDisplay,
} from "./sales-inventory-policy";
export type {
	SalesInventoryOperationMode,
	SalesInventoryOperationPolicy,
	SalesInventoryOverviewSetupMode,
	SalesInventoryRequirementDisplayStatus,
} from "./sales-inventory-policy";

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
	id?: number | null;
	required?: boolean | null;
	qty?: number | null;
	qtyAllocated?: number | null;
	qtyInbound?: number | null;
	qtyReceived?: number | null;
	status?: string | null;
	price?:
		| number
		| {
				costPrice?: number | null;
				salesPrice?: number | null;
				unitCostPrice?: number | null;
				unitSalesPrice?: number | null;
		  }
		| null;
	inventoryId?: number | null;
	inventoryVariantId?: number | null;
	inventoryCategoryId?: number | null;
	inventory?: {
		id?: number | null;
		name?: string | null;
		productKind?: string | null;
		stockMode?: string | null;
		status?: string | null;
	} | null;
	inventoryVariant?: {
		id?: number | null;
		uid?: string | null;
		sku?: string | null;
		description?: string | null;
		status?: string | null;
		attributes?: Array<{
			value?: {
				name?: string | null;
				inventoryCategory?: {
					title?: string | null;
				} | null;
			} | null;
			inventoryCategoryVariantAttribute?: {
				inventoryCategory?: {
					title?: string | null;
				} | null;
			} | null;
		}> | null;
		stocks?: Array<{
			qty?: number | null;
		}> | null;
	} | null;
	inventoryCategory?: {
		id?: number | null;
		title?: string | null;
		productKind?: string | null;
		stockMode?: string | null;
	} | null;
	subComponent?: {
		id?: number | null;
		required?: boolean | null;
		inventoryCategoryId?: number | null;
		inventoryCategory?: {
			id?: number | null;
			title?: string | null;
			productKind?: string | null;
			stockMode?: string | null;
		} | null;
		defaultInventory?: {
			id?: number | null;
			name?: string | null;
			productKind?: string | null;
			stockMode?: string | null;
		} | null;
	} | null;
	inboundDemands?: Array<{
		id?: number | null;
		qty?: number | null;
		qtyReceived?: number | null;
		status?: string | null;
		inboundShipmentItemId?: number | null;
		inventoryVariantId?: number | null;
	}> | null;
	stockAllocations?: Array<{
		id?: number | null;
		qty?: number | null;
		status?: string | null;
		inventoryStockId?: number | null;
		inventoryVariantId?: number | null;
	}> | null;
};

export type SalesInventoryOverviewLineItemLike = {
	id?: number | null;
	uid?: string | null;
	sn?: number | null;
	title?: string | null;
	description?: string | null;
	qty?: number | null;
	unitCost?: number | null;
	totalCost?: number | null;
	salesItemId?: number | null;
	inventoryId?: number | null;
	inventoryVariantId?: number | null;
	inventoryCategoryId?: number | null;
	inventory?: {
		id?: number | null;
		name?: string | null;
		productKind?: string | null;
		stockMode?: string | null;
		status?: string | null;
	} | null;
	variant?: {
		id?: number | null;
		sku?: string | null;
		status?: string | null;
	} | null;
	inventoryCategory?: {
		id?: number | null;
		title?: string | null;
		productKind?: string | null;
		stockMode?: string | null;
	} | null;
	salesItem?: {
		id?: number | null;
		description?: string | null;
		dykeDescription?: string | null;
		qty?: number | null;
	} | null;
	components?: SalesInventoryOverviewComponentLike[] | null;
};

export type GetSalesInventoryOverviewInput = {
	salesOrderId: number;
};

export type SalesOverviewInventoryTrackingPolicy =
	| "tracked"
	| "untracked"
	| "not_inventory";

export type SalesOverviewInventoryLineStatus =
	| "fulfilled"
	| "allocated"
	| "partial"
	| "ordered"
	| "available"
	| "needs_allocation"
	| "shortage"
	| "untracked"
	| "not_inventory";

export type SalesOverviewInventoryLineAction =
	| "configure_tracking"
	| "mark_not_inventory"
	| "allocate_from_stock"
	| "create_inbound"
	| "open_stock";

export type SalesOverviewInventoryLine = {
	id: string;
	componentId: number | null;
	lineItemId: number | null;
	salesItemId: number | null;
	componentName: string;
	stepName: string | null;
	qtyRequired: number;
	qtyInStock: number;
	qtyAllocated: number;
	qtyPending: number;
	qtyInboundOpen: number;
	qtyInboundLinkedOpen: number;
	cost: number | null;
	salesPrice: number | null;
	status: SalesOverviewInventoryLineStatus;
	requirementStatus: SalesInventoryRequirementDisplayStatus;
	requirementLabel: string;
	requirementShortLabel: string;
	canEditInboundStatus: boolean;
	sourceStatus: string | null;
	trackingPolicy: SalesOverviewInventoryTrackingPolicy;
	inventoryId: number | null;
	inventoryVariantId: number | null;
	inventoryCategoryId: number | null;
	inventoryProductKind: string | null;
	inventoryCategoryProductKind: string | null;
	inventoryStockMode: string | null;
	inventoryCategoryStockMode: string | null;
	variantSku: string | null;
	variantUid: string | null;
	variantName: string | null;
	inboundDemandIds: number[];
	pendingInboundDemandIds: number[];
	pendingStockAllocationIds: number[];
	actions: SalesOverviewInventoryLineAction[];
};

export type SalesOverviewInventoryGroup = {
	id: string;
	lineItemId: number | null;
	salesItemId: number | null;
	label: string;
	qty: number;
	rows: SalesOverviewInventoryLine[];
	totals: {
		qtyRequired: number;
		qtyInStock: number;
		qtyAllocated: number;
		qtyPending: number;
		cost: number;
		salesPrice: number;
	};
};

export type SalesOverviewInventoryMergedLine = SalesOverviewInventoryLine & {
	sourceLineCount: number;
	componentIds: number[];
	lineItemIds: number[];
	salesItemIds: number[];
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

function positiveNumberValue(value?: number | null) {
	return Math.max(0, numberValue(value));
}

function roundCurrencyValue(value: number) {
	return roundMoney(value);
}

function sumCurrencyBy<T>(
	items: T[] | null | undefined,
	read: (item: T) => number,
) {
	return roundCurrencyValue(sumBy(items, read));
}

function linePricingCostValue(
	price: SalesInventoryOverviewComponentLike["price"],
	qty: number,
) {
	if (price == null) return null;
	if (typeof price === "number") return numberValue(price);

	if (price.costPrice != null) return numberValue(price.costPrice);
	if (price.unitCostPrice != null) {
		return numberValue(price.unitCostPrice) * qty;
	}

	return null;
}

function linePricingSalesValue(
	price: SalesInventoryOverviewComponentLike["price"],
	qty: number,
) {
	if (price == null || typeof price === "number") return null;

	if (price.salesPrice != null) return numberValue(price.salesPrice);
	if (price.unitSalesPrice != null) {
		return numberValue(price.unitSalesPrice) * qty;
	}

	return null;
}

function sumBy<T>(items: T[] | null | undefined, read: (item: T) => number) {
	return (items || []).reduce((total, item) => total + read(item), 0);
}

function formatInvoiceItemLabel(
	lineItem: SalesInventoryOverviewLineItemLike,
	index: number,
) {
	return (
		lineItem.salesItem?.description ||
		lineItem.salesItem?.dykeDescription ||
		lineItem.description ||
		lineItem.title ||
		`Invoice Item ${index + 1}`
	);
}

function componentDisplayName(component: SalesInventoryOverviewComponentLike) {
	return (
		component.inventory?.name ||
		component.subComponent?.defaultInventory?.name ||
		component.inventoryVariant?.sku ||
		component.subComponent?.inventoryCategory?.title ||
		component.inventoryCategory?.title ||
		"Inventory component"
	);
}

function componentStepName(component: SalesInventoryOverviewComponentLike) {
	return (
		component.inventoryCategory?.title ||
		component.subComponent?.inventoryCategory?.title ||
		null
	);
}

function variantAttributeLabel(
	attribute: NonNullable<
		NonNullable<
			SalesInventoryOverviewComponentLike["inventoryVariant"]
		>["attributes"]
	>[number],
) {
	return (
		attribute.value?.inventoryCategory?.title ||
		attribute.inventoryCategoryVariantAttribute?.inventoryCategory?.title ||
		null
	);
}

function standardDoorDimensionPart(value: string | null | undefined) {
	const raw = value?.trim();
	if (!raw) return null;

	const uidMatch = raw.match(/^[wh](\d+)_(\d+)$/i);
	if (uidMatch) return `${uidMatch[1]}-${uidMatch[2]}`;

	const dashedMatch = raw.match(/^(\d+)-(\d+)$/);
	if (dashedMatch) return `${dashedMatch[1]}-${dashedMatch[2]}`;

	const spacedMatch = raw.match(/^(\d+)\s*[xX]\s*(\d+)$/);
	if (spacedMatch) return `${spacedMatch[1]}-${spacedMatch[2]}`;

	return raw;
}

function standardDoorSizeFromUid(value: string | null | undefined) {
	const raw = value?.trim();
	if (!raw) return null;

	const match = raw.match(/^w(\d+)_(\d+)-h(\d+)_(\d+)$/i);
	if (!match) return null;

	return `${match[1]}-${match[2]} x ${match[3]}-${match[4]}`;
}

function inventoryVariantDisplayName(
	variant: SalesInventoryOverviewComponentLike["inventoryVariant"],
) {
	if (!variant) return null;

	const attributes = variant.attributes || [];
	const attributeValues = attributes
		.map((attribute) => ({
			label: variantAttributeLabel(attribute)?.trim() || null,
			value: attribute.value?.name?.trim() || null,
		}))
		.filter((attribute) => attribute.value);
	const width = attributeValues.find(
		(attribute) => attribute.label?.toLowerCase() === "width",
	);
	const height = attributeValues.find(
		(attribute) => attribute.label?.toLowerCase() === "height",
	);
	const otherValues = attributeValues
		.filter(
			(attribute) =>
				!["width", "height"].includes(attribute.label?.toLowerCase() || ""),
		)
		.map((attribute) => attribute.value)
		.filter(Boolean);
	const attributeDisplay =
		width?.value && height?.value
			? [
					`${standardDoorDimensionPart(width.value)} x ${standardDoorDimensionPart(height.value)}`,
					...otherValues,
				].join(" ")
			: attributeValues
					.map((attribute) => attribute.value)
					.filter(Boolean)
					.join(" ");

	return (
		attributeDisplay ||
		standardDoorSizeFromUid(variant.uid) ||
		variant.description?.trim() ||
		variant.sku?.trim() ||
		null
	);
}

function resolveTrackingPolicy(
	component: SalesInventoryOverviewComponentLike,
): SalesOverviewInventoryTrackingPolicy {
	const productKinds = [
		component.inventoryCategory?.productKind,
		component.subComponent?.inventoryCategory?.productKind,
		component.inventory?.productKind,
		component.subComponent?.defaultInventory?.productKind,
	].filter(Boolean);
	const productKind = productKinds.includes("component")
		? "component"
		: productKinds[0] || null;
	const stockMode =
		component.inventoryCategory?.stockMode ||
		component.subComponent?.inventoryCategory?.stockMode ||
		component.inventory?.stockMode ||
		component.subComponent?.defaultInventory?.stockMode ||
		null;
	const hasInventoryIdentity =
		!!component.inventoryVariantId ||
		!!component.inventoryVariant?.id ||
		!!component.inventoryId ||
		!!component.inventory?.id;

	if (!hasInventoryIdentity) return "not_inventory";
	if (productKind === "component") return "not_inventory";
	if (stockMode === "monitored") return "tracked";
	return "untracked";
}

function resolveLineStatus(input: {
	trackingPolicy: SalesOverviewInventoryTrackingPolicy;
	requiredQty: number;
	stockQty: number;
	allocatedQty: number;
	pendingQty: number;
	inboundOpenQty: number;
	sourceStatus?: string | null;
}): SalesOverviewInventoryLineStatus {
	if (input.trackingPolicy === "not_inventory") return "not_inventory";
	if (input.trackingPolicy === "untracked") return "untracked";
	if (input.sourceStatus === "fulfilled") return "fulfilled";
	if (input.requiredQty <= 0) return "allocated";
	if (input.pendingQty <= 0) return "allocated";
	if (input.allocatedQty > 0 || input.stockQty > 0) {
		if (input.inboundOpenQty > 0) return "partial";
		return input.stockQty > input.allocatedQty ? "available" : "partial";
	}
	if (input.inboundOpenQty > 0) return "ordered";
	if (
		input.sourceStatus === "pending" ||
		input.sourceStatus === "partially_allocated"
	) {
		return "needs_allocation";
	}
	return "shortage";
}

function resolveLineActions(input: {
	trackingPolicy: SalesOverviewInventoryTrackingPolicy;
	stockQty: number;
	allocatedQty: number;
	pendingQty: number;
	inventoryId: number | null;
}): SalesOverviewInventoryLineAction[] {
	const actions: SalesOverviewInventoryLineAction[] = [
		"configure_tracking",
		"mark_not_inventory",
	];

	if (input.inventoryId) actions.push("open_stock");
	if (
		input.trackingPolicy === "tracked" &&
		input.pendingQty > 0 &&
		input.stockQty > input.allocatedQty
	) {
		actions.push("allocate_from_stock");
	}
	if (input.trackingPolicy === "tracked" && input.pendingQty > 0) {
		actions.push("create_inbound");
	}

	return actions;
}

export function buildSalesOverviewInventoryGroups(
	lineItems: SalesInventoryOverviewLineItemLike[],
): SalesOverviewInventoryGroup[] {
	return lineItems.map((lineItem, index) => {
		const rows = (lineItem.components || []).map(
			(component, componentIndex) => {
				const qtyRequired = positiveNumberValue(component.qty);
				const qtyAllocated = positiveNumberValue(component.qtyAllocated);
				const qtyReceived = positiveNumberValue(component.qtyReceived);
				const qtyInbound = positiveNumberValue(component.qtyInbound);
				const qtyInboundOpen = Math.max(0, qtyInbound - qtyReceived);
				const qtyPending = Math.max(
					0,
					qtyRequired - qtyAllocated - qtyReceived,
				);
				const qtyInStock = sumBy(component.inventoryVariant?.stocks, (stock) =>
					positiveNumberValue(stock.qty),
				);
				const trackingPolicy = resolveTrackingPolicy(component);
				const inventoryId =
					component.inventoryId ?? component.inventory?.id ?? null;
				const inventoryVariantId =
					component.inventoryVariantId ??
					component.inventoryVariant?.id ??
					null;
				const inventoryCategoryId =
					component.inventoryCategoryId ??
					component.inventoryCategory?.id ??
					component.subComponent?.inventoryCategoryId ??
					component.subComponent?.inventoryCategory?.id ??
					null;
				const inventoryProductKind =
					component.inventory?.productKind ??
					component.subComponent?.defaultInventory?.productKind ??
					null;
				const inventoryCategoryProductKind =
					component.inventoryCategory?.productKind ??
					component.subComponent?.inventoryCategory?.productKind ??
					null;
				const inventoryStockMode =
					component.inventory?.stockMode ??
					component.subComponent?.defaultInventory?.stockMode ??
					null;
				const inventoryCategoryStockMode =
					component.inventoryCategory?.stockMode ??
					component.subComponent?.inventoryCategory?.stockMode ??
					null;
				const status = resolveLineStatus({
					trackingPolicy,
					requiredQty: qtyRequired,
					stockQty: qtyInStock,
					allocatedQty: qtyAllocated,
					pendingQty: qtyPending,
					inboundOpenQty: qtyInboundOpen,
					sourceStatus: component.status,
				});
				const requirementDisplay = resolveSalesInventoryRequirementDisplay({
					trackingPolicy,
					requiredQty: qtyRequired,
				});
				const cost = linePricingCostValue(component.price, qtyRequired);
				const salesPrice = linePricingSalesValue(component.price, qtyRequired);
				const inboundDemands = component.inboundDemands || [];
				const inboundDemandIds = uniqueNumbers(
					inboundDemands.map((demand) => demand.id ?? null),
				);
				const pendingInboundDemandIds = uniqueNumbers(
					inboundDemands
						.filter((demand) => {
							const outstanding = Math.max(
								0,
								numberValue(demand.qty) - numberValue(demand.qtyReceived),
							);
							return (
								outstanding > 0 &&
								demand.status === "pending" &&
								!demand.inboundShipmentItemId
							);
						})
						.map((demand) => demand.id ?? null),
				);
				const qtyInboundLinkedOpen = inboundDemands.reduce((total, demand) => {
					const outstanding = Math.max(
						0,
						numberValue(demand.qty) - numberValue(demand.qtyReceived),
					);
					return demand.inboundShipmentItemId ? total + outstanding : total;
				}, 0);
				const pendingStockAllocationIds = uniqueNumbers(
					(component.stockAllocations || [])
						.filter(
							(allocation) =>
								allocation.status === "pending_review" &&
								numberValue(allocation.qty) > 0,
						)
						.map((allocation) => allocation.id ?? null),
				);

				return {
					id: String(
						component.id ?? `${lineItem.id ?? index}-${componentIndex}`,
					),
					componentId: component.id ?? null,
					lineItemId: lineItem.id ?? null,
					salesItemId: lineItem.salesItemId ?? lineItem.salesItem?.id ?? null,
					componentName: componentDisplayName(component),
					stepName: componentStepName(component),
					qtyRequired,
					qtyInStock,
					qtyAllocated,
					qtyPending,
					qtyInboundOpen,
					qtyInboundLinkedOpen,
					cost,
					salesPrice,
					status,
					requirementStatus: requirementDisplay.status,
					requirementLabel: requirementDisplay.label,
					requirementShortLabel: requirementDisplay.shortLabel,
					canEditInboundStatus: requirementDisplay.canEditInboundStatus,
					sourceStatus: component.status ?? null,
					trackingPolicy,
					inventoryId,
					inventoryVariantId,
					inventoryCategoryId,
					inventoryProductKind,
					inventoryCategoryProductKind,
					inventoryStockMode,
					inventoryCategoryStockMode,
					variantSku: component.inventoryVariant?.sku ?? null,
					variantUid: component.inventoryVariant?.uid ?? null,
					variantName: inventoryVariantDisplayName(component.inventoryVariant),
					inboundDemandIds,
					pendingInboundDemandIds,
					pendingStockAllocationIds,
					actions: resolveLineActions({
						trackingPolicy,
						stockQty: qtyInStock,
						allocatedQty: qtyAllocated,
						pendingQty: qtyPending,
						inventoryId,
					}),
				};
			},
		);

		return {
			id: String(lineItem.id ?? lineItem.uid ?? index),
			lineItemId: lineItem.id ?? null,
			salesItemId: lineItem.salesItemId ?? lineItem.salesItem?.id ?? null,
			label: formatInvoiceItemLabel(lineItem, index),
			qty: positiveNumberValue(lineItem.salesItem?.qty ?? lineItem.qty),
			rows,
			totals: {
				qtyRequired: sumBy(rows, (row) => row.qtyRequired),
				qtyInStock: sumBy(rows, (row) => row.qtyInStock),
				qtyAllocated: sumBy(rows, (row) => row.qtyAllocated),
				qtyPending: sumBy(rows, (row) => row.qtyPending),
				cost: sumCurrencyBy(rows, (row) => numberValue(row.cost)),
				salesPrice: sumCurrencyBy(rows, (row) => numberValue(row.salesPrice)),
			},
		};
	});
}

function mergedLineKey(row: SalesOverviewInventoryLine) {
	return [
		row.trackingPolicy,
		row.inventoryVariantId ?? "variant:none",
		row.inventoryId ?? "inventory:none",
		row.inventoryCategoryId ?? "category:none",
		row.componentName.trim().toLowerCase(),
		row.stepName?.trim().toLowerCase() ?? "step:none",
		row.variantSku?.trim().toLowerCase() ?? "sku:none",
	].join("|");
}

function uniqueNumbers(values: Array<number | null>) {
	return Array.from(
		new Set(values.filter((value): value is number => value != null)),
	).sort((a, b) => a - b);
}

function aggregateLineStatus(
	rows: SalesOverviewInventoryLine[],
): SalesOverviewInventoryLineStatus {
	const rank: Record<SalesOverviewInventoryLineStatus, number> = {
		shortage: 90,
		needs_allocation: 80,
		partial: 70,
		ordered: 60,
		available: 50,
		allocated: 40,
		fulfilled: 30,
		untracked: 20,
		not_inventory: 10,
	};

	return rows.reduce(
		(highest, row) => (rank[row.status] > rank[highest] ? row.status : highest),
		rows[0]?.status ?? "not_inventory",
	);
}

function aggregateLineActions(
	rows: SalesOverviewInventoryLine[],
	input: {
		trackingPolicy: SalesOverviewInventoryTrackingPolicy;
		stockQty: number;
		allocatedQty: number;
		pendingQty: number;
		inventoryId: number | null;
	},
) {
	const actionSet = new Set<SalesOverviewInventoryLineAction>(
		resolveLineActions(input),
	);

	for (const row of rows) {
		for (const action of row.actions) actionSet.add(action);
	}

	if (!input.inventoryId) actionSet.delete("open_stock");
	if (
		input.trackingPolicy !== "tracked" ||
		input.pendingQty <= 0 ||
		input.stockQty <= input.allocatedQty
	) {
		actionSet.delete("allocate_from_stock");
	}
	if (input.trackingPolicy !== "tracked" || input.pendingQty <= 0) {
		actionSet.delete("create_inbound");
	}

	return Array.from(actionSet);
}

export function buildSalesOverviewInventoryMergedRows(
	groups: SalesOverviewInventoryGroup[],
): SalesOverviewInventoryMergedLine[] {
	const rowsByKey = new Map<string, SalesOverviewInventoryLine[]>();

	for (const group of groups) {
		for (const row of group.rows) {
			const key = mergedLineKey(row);
			rowsByKey.set(key, [...(rowsByKey.get(key) || []), row]);
		}
	}

	return Array.from(rowsByKey.values())
		.flatMap((rows): SalesOverviewInventoryMergedLine[] => {
			const base = rows[0];
			if (!base) return [];
			const qtyRequired = sumBy(rows, (row) => row.qtyRequired);
			const qtyAllocated = sumBy(rows, (row) => row.qtyAllocated);
			const qtyPending = sumBy(rows, (row) => row.qtyPending);
			const qtyInboundOpen = sumBy(rows, (row) => row.qtyInboundOpen);
			const qtyInboundLinkedOpen = sumBy(
				rows,
				(row) => row.qtyInboundLinkedOpen,
			);
			const qtyInStock = Math.max(...rows.map((row) => row.qtyInStock));
			const inventoryId =
				base.inventoryId ??
				rows.find((row) => row.inventoryId)?.inventoryId ??
				null;
			const trackingPolicy = base.trackingPolicy;
			const requirementDisplay = resolveSalesInventoryRequirementDisplay({
				trackingPolicy,
				requiredQty: qtyRequired,
			});

			return [
				{
					...base,
					id: mergedLineKey(base),
					componentId: null,
					lineItemId: null,
					salesItemId: null,
					qtyRequired,
					qtyInStock,
					qtyAllocated,
					qtyPending,
					qtyInboundOpen,
					qtyInboundLinkedOpen,
					cost: rows.some((row) => row.cost != null)
						? sumCurrencyBy(rows, (row) => numberValue(row.cost))
						: null,
					salesPrice: rows.some((row) => row.salesPrice != null)
						? sumCurrencyBy(rows, (row) => numberValue(row.salesPrice))
						: null,
					status: aggregateLineStatus(rows),
					requirementStatus: requirementDisplay.status,
					requirementLabel: requirementDisplay.label,
					requirementShortLabel: requirementDisplay.shortLabel,
					canEditInboundStatus: requirementDisplay.canEditInboundStatus,
					sourceStatus: null,
					inventoryId,
					inventoryVariantId:
						base.inventoryVariantId ??
						rows.find((row) => row.inventoryVariantId)?.inventoryVariantId ??
						null,
					inventoryCategoryId:
						base.inventoryCategoryId ??
						rows.find((row) => row.inventoryCategoryId)?.inventoryCategoryId ??
						null,
					inboundDemandIds: uniqueNumbers(
						rows.flatMap((row) => row.inboundDemandIds),
					),
					pendingInboundDemandIds: uniqueNumbers(
						rows.flatMap((row) => row.pendingInboundDemandIds),
					),
					pendingStockAllocationIds: uniqueNumbers(
						rows.flatMap((row) => row.pendingStockAllocationIds),
					),
					actions: aggregateLineActions(rows, {
						trackingPolicy,
						stockQty: qtyInStock,
						allocatedQty: qtyAllocated,
						pendingQty: qtyPending,
						inventoryId,
					}),
					sourceLineCount: rows.length,
					componentIds: uniqueNumbers(rows.map((row) => row.componentId)),
					lineItemIds: uniqueNumbers(rows.map((row) => row.lineItemId)),
					salesItemIds: uniqueNumbers(rows.map((row) => row.salesItemId)),
				},
			];
		})
		.sort((a, b) => {
			const step = (a.stepName || "").localeCompare(b.stepName || "");
			if (step) return step;
			return a.componentName.localeCompare(b.componentName);
		});
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
				hasInbound ||
				INBOUND_COMPONENT_STATUSES.has(status) ||
				stillAwaitingInbound;
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

export type SalesInventoryTrackingChangeRepairPreviewInput = {
	inventoryCategoryId: number;
	limit?: number | null;
};

export type SalesInventoryTrackingChangeRepairPreviewOrder = {
	salesOrderId: number;
	orderId: string;
	lifecycleStatus: SalesOrderLifecycleStatus;
	lifecycleLabel: string;
	pendingQty: number;
	componentCount: number;
	componentNames: string[];
};

export type SalesInventoryTrackingChangeRepairPreview = {
	inventoryCategoryId: number;
	eligibleOrderCount: number;
	skippedReadOnlyOrderCount: number;
	totalPendingQty: number;
	orders: SalesInventoryTrackingChangeRepairPreviewOrder[];
	truncated: boolean;
};

export async function getSalesInventoryTrackingChangeRepairPreview(
	db: Db,
	input: SalesInventoryTrackingChangeRepairPreviewInput,
): Promise<SalesInventoryTrackingChangeRepairPreview> {
	const limit = Math.min(Math.max(Number(input.limit || 25), 1), 50);
	const components = await db.lineItemComponents.findMany({
		where: {
			inventoryCategoryId: input.inventoryCategoryId,
			parent: {
				deletedAt: null,
				lineItemType: "SALE",
				sale: {
					is: {
						deletedAt: null,
					},
				},
			},
		},
		orderBy: {
			id: "desc",
		},
		take: 1000,
		select: {
			id: true,
			qty: true,
			qtyAllocated: true,
			qtyReceived: true,
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
			inventoryCategory: {
				select: {
					title: true,
				},
			},
			parent: {
				select: {
					saleId: true,
					salesItem: {
						select: {
							description: true,
							dykeDescription: true,
						},
					},
					sale: {
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
										in: [
											"dispatchCompleted",
											"dispatchInProgress",
											"dispatchAssigned",
										],
									},
								},
								select: {
									type: true,
									status: true,
									percentage: true,
								},
							},
						},
					},
				},
			},
		},
	});

	const ordersById = new Map<
		number,
		SalesInventoryTrackingChangeRepairPreviewOrder
	>();
	const skippedReadOnlyOrderIds = new Set<number>();

	for (const component of components) {
		const sale = component.parent.sale;
		if (!sale) continue;

		const pendingQty = Math.max(
			0,
			numberValue(component.qty) -
				numberValue(component.qtyAllocated) -
				numberValue(component.qtyReceived),
		);
		if (pendingQty <= 0) continue;

		const fulfillmentStatus = resolveSalesInventoryFulfillmentStatus({
			deliveries: sale.deliveries,
			stats: sale.stat,
		});
		const lifecycle = getSalesOrderLifecycleStatusInfo({
			orderStatus: sale.status,
			legacyProductionStatus: sale.prodStatus,
			fulfillmentStatus,
		});

		if (hasPassedInventoryTrackingRepairBoundary(lifecycle.status)) {
			skippedReadOnlyOrderIds.add(sale.id);
			continue;
		}

		const name =
			component.inventory?.name ||
			component.inventoryVariant?.sku ||
			component.inventoryVariant?.uid ||
			component.inventoryCategory?.title ||
			component.parent.salesItem?.description ||
			component.parent.salesItem?.dykeDescription ||
			"Inventory component";
		const current = ordersById.get(sale.id) ?? {
			salesOrderId: sale.id,
			orderId: sale.orderId,
			lifecycleStatus: lifecycle.status,
			lifecycleLabel: lifecycle.label,
			pendingQty: 0,
			componentCount: 0,
			componentNames: [],
		};

		current.pendingQty += pendingQty;
		current.componentCount += 1;
		if (!current.componentNames.includes(name)) {
			current.componentNames.push(name);
		}
		ordersById.set(sale.id, current);
	}

	const allOrders = Array.from(ordersById.values()).sort((a, b) => {
		const qty = b.pendingQty - a.pendingQty;
		if (qty) return qty;
		return b.salesOrderId - a.salesOrderId;
	});
	const orders = allOrders.slice(0, limit).map((order) => ({
		...order,
		pendingQty: positiveNumberValue(order.pendingQty),
		componentNames: order.componentNames.slice(0, 4),
	}));

	return {
		inventoryCategoryId: input.inventoryCategoryId,
		eligibleOrderCount: allOrders.length,
		skippedReadOnlyOrderCount: skippedReadOnlyOrderIds.size,
		totalPendingQty: positiveNumberValue(
			allOrders.reduce((total, order) => total + order.pendingQty, 0),
		),
		orders,
		truncated: allOrders.length > orders.length,
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
			deliveries: {
				where: {
					deletedAt: null,
				},
				orderBy: [
					{
						deliveredAt: "desc",
					},
					{
						id: "desc",
					},
				],
				select: {
					id: true,
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
									description: true,
									status: true,
									attributes: {
										select: {
											value: {
												select: {
													name: true,
													inventoryCategory: {
														select: {
															title: true,
														},
													},
												},
											},
											inventoryCategoryVariantAttribute: {
												select: {
													inventoryCategory: {
														select: {
															title: true,
														},
													},
												},
											},
										},
									},
									stocks: {
										where: {
											deletedAt: null,
										},
										select: {
											qty: true,
										},
									},
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

	const { deliveries, stat, ...saleSnapshot } = sale;
	const groups = buildSalesOverviewInventoryGroups(sale.lineItems);
	const rows = buildSalesOverviewInventoryMergedRows(groups);
	const fulfillmentStatus = resolveSalesInventoryFulfillmentStatus({
		deliveries,
		stats: stat,
	});
	const lifecycle = getSalesOrderLifecycleStatusInfo({
		orderStatus: sale.status,
		legacyProductionStatus: sale.prodStatus,
		fulfillmentStatus,
	});
	const setupMode = resolveSalesInventoryOverviewSetupMode({
		lifecycleStatus: lifecycle.status,
		inventoryRowCount: rows.length,
		inventoryStatus: sale.inventoryStatus,
	});
	const operationPolicy = resolveSalesInventoryOperationPolicy({
		lifecycleStatus: lifecycle.status,
		setupMode,
	});

	return {
		...saleSnapshot,
		lifecycleStatus: lifecycle.status,
		lifecycleLabel: lifecycle.label,
		lifecycleTone: lifecycle.tone,
		fulfillmentStatus,
		setupMode,
		operationMode: operationPolicy.mode,
		capabilities: operationPolicy.capabilities,
		isInventoryReadOnly: operationPolicy.isReadOnly,
		inventoryActionBlockReason: operationPolicy.reason,
		hasInventoryIntegration: rows.length > 0,
		summary: summarizeSalesInventoryOverview(sale.lineItems),
		groups,
		rows,
	};
}
