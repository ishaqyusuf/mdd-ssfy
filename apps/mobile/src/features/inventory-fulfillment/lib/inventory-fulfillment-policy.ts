import type { ICan } from "@gnd/utils/constants";
import type { InventoryFulfillmentItem } from "./inventory-fulfillment-model";

type PermissionSet = Partial<ICan> | null | undefined;

export function canViewInventoryFulfillment(can: PermissionSet) {
	return Boolean(
		can?.viewOrders ||
			can?.viewPacking ||
			can?.viewInboundOrder ||
			can?.viewPickup ||
			can?.viewDelivery,
	);
}

export function canManageInventoryFulfillment(can: PermissionSet) {
	return Boolean(
		can?.editOrders || can?.editPickup || can?.editDelivery || can?.viewPacking,
	);
}

export function getInventoryShipmentSelection(
	items: InventoryFulfillmentItem[],
) {
	const saleIds = new Set(
		items.map((item) => item.salesOrderId).filter(Boolean),
	);
	const valid =
		items.length > 0 &&
		saleIds.size === 1 &&
		items.every(
			(item) => item.salesOrderId && item.lineItemId && item.canShipNow,
		);
	return {
		valid,
		reason: valid ? null : "Select shippable lines from one sales order.",
	};
}
