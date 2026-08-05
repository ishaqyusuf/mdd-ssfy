import type { RouterOutputs } from "@api/trpc/routers/_app";
import type { DeliveryOption } from "@gnd/utils/sales";

export const backorderStatuses = [
	"awaiting_inbound",
	"backordered",
	"ready_to_ship_remaining",
] as const;
export const partialShipmentStatuses = [
	"available_now",
	"held_until_complete",
	...backorderStatuses,
] as const;
export const fulfillmentDeliveryModes = [
	"pickup",
	"delivery",
	"ship",
] as const satisfies readonly DeliveryOption[];

export type InventoryFulfillmentMode = "backorders" | "partial-shipments";
export type BackorderStatus = (typeof backorderStatuses)[number];
export type PartialShipmentStatus = (typeof partialShipmentStatuses)[number];
export type InventoryFulfillmentStatus = PartialShipmentStatus;
export type BackorderApiItem =
	RouterOutputs["inventories"]["salesBackorderQueue"]["items"][number];
export type PartialShipmentApiItem =
	RouterOutputs["inventories"]["salesPartialShipmentQueue"]["items"][number];

export type InventoryFulfillmentItem = {
	key: string;
	salesOrderId: number | null;
	lineItemId: number | null;
	orderId: string | null;
	customerName: string;
	title: string;
	status: InventoryFulfillmentStatus;
	deliveryMode: DeliveryOption | null;
	orderStatus: string | null;
	holdUntilComplete: boolean;
	canShipNow: boolean;
	orderedQty: number;
	remainingQty: number;
	availableToShipQty: number;
	backorderedQty: number;
	inboundQty: number;
	shippedQty: number;
	heldBackQty: number;
	blockerLabel: string | null;
	blockerCount: number;
};

function componentLabel(
	component: BackorderApiItem["blockerComponents"][number],
) {
	return (
		component.componentName ||
		component.inventoryName ||
		component.inventoryCategoryName ||
		component.inventoryVariantSku ||
		(component.id ? `Component ${component.id}` : null)
	);
}

export function adaptInventoryFulfillmentItem(
	item: BackorderApiItem | PartialShipmentApiItem,
	mode: InventoryFulfillmentMode,
): InventoryFulfillmentItem {
	const partialStatus =
		mode === "partial-shipments" && "partialStatus" in item
			? item.partialStatus
			: item.status;
	return {
		key: `${item.salesOrderId ?? "sale"}-${item.lineItemId ?? "line"}`,
		salesOrderId: item.salesOrderId,
		lineItemId: item.lineItemId,
		orderId: item.orderId,
		customerName: item.customerName || "Unknown customer",
		title: item.title || item.uid || "Untitled line item",
		status: partialStatus,
		deliveryMode: item.deliveryMode,
		orderStatus: item.orderStatus,
		holdUntilComplete: item.holdUntilComplete,
		canShipNow: item.canShipNow,
		orderedQty: item.orderedQty,
		remainingQty: item.remainingQty,
		availableToShipQty: item.availableToShipQty,
		backorderedQty: item.backorderedQty,
		inboundQty: item.inboundQty,
		shippedQty: item.shippedQty,
		heldBackQty: item.heldBackQty,
		blockerLabel: item.blockerComponents[0]
			? componentLabel(item.blockerComponents[0])
			: null,
		blockerCount: item.blockerComponents.length,
	};
}

export function isBackorderStatus(
	status: InventoryFulfillmentStatus,
): status is BackorderStatus {
	return backorderStatuses.includes(status as BackorderStatus);
}

export function formatFulfillmentLabel(value?: string | null) {
	if (!value) return "Unknown";
	return value
		.replaceAll("_", " ")
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatFulfillmentQty(value?: number | null) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}
