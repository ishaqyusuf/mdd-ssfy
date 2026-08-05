import type { DeliveryOption } from "@gnd/utils/sales";

import {
	type SalesOrderLifecycleStatus,
	getSalesOrderLifecycleStatus,
} from "./order-status";

export const INVENTORY_FULFILLMENT_TERMINAL_STATUSES = [
	"fulfilled",
	"cancelled",
] as const satisfies readonly SalesOrderLifecycleStatus[];

const TERMINAL_STATUS_SET = new Set<SalesOrderLifecycleStatus>(
	INVENTORY_FULFILLMENT_TERMINAL_STATUSES,
);

export type InventoryFulfillmentSaleState = {
	orderStatus?: string | null;
	productionStatus?: string | null;
	fulfillmentStatus?: string | null;
};

export class InventoryFulfillmentPolicyError extends Error {
	readonly code:
		| "INVENTORY_FULFILLMENT_TERMINAL_ORDER"
		| "INVENTORY_FULFILLMENT_DELIVERY_MODE_REQUIRED"
		| "INVENTORY_FULFILLMENT_LINE_SELECTION_INVALID";

	constructor(
		code:
			| "INVENTORY_FULFILLMENT_TERMINAL_ORDER"
			| "INVENTORY_FULFILLMENT_DELIVERY_MODE_REQUIRED"
			| "INVENTORY_FULFILLMENT_LINE_SELECTION_INVALID",
		message: string,
	) {
		super(message);
		this.name = "InventoryFulfillmentPolicyError";
		this.code = code;
	}
}

export function resolveInventoryFulfillmentLifecycle(
	input: InventoryFulfillmentSaleState,
) {
	return getSalesOrderLifecycleStatus({
		orderStatus: input.orderStatus,
		productionStatus: input.productionStatus,
		fulfillmentStatus: input.fulfillmentStatus,
	});
}

export function isInventoryFulfillmentTerminalSale(
	input: InventoryFulfillmentSaleState,
) {
	return TERMINAL_STATUS_SET.has(resolveInventoryFulfillmentLifecycle(input));
}

export function assertInventoryFulfillmentMutableSale(
	input: InventoryFulfillmentSaleState,
) {
	const lifecycleStatus = resolveInventoryFulfillmentLifecycle(input);
	if (TERMINAL_STATUS_SET.has(lifecycleStatus)) {
		throw new InventoryFulfillmentPolicyError(
			"INVENTORY_FULFILLMENT_TERMINAL_ORDER",
			`Inventory fulfillment is read-only for ${lifecycleStatus} sales.`,
		);
	}
	return lifecycleStatus;
}

export function resolveInventoryFulfillmentDeliveryMode(input: {
	requested?: DeliveryOption | null;
	orderDefault?: string | null;
}): DeliveryOption {
	if (input.requested) return input.requested;
	const orderDefault = normalizeInventoryFulfillmentDeliveryMode(
		input.orderDefault,
	);
	if (orderDefault) return orderDefault;
	throw new InventoryFulfillmentPolicyError(
		"INVENTORY_FULFILLMENT_DELIVERY_MODE_REQUIRED",
		"Choose pickup, delivery, or ship before completing this shipment.",
	);
}

export function normalizeInventoryFulfillmentDeliveryMode(
	value?: string | null,
): DeliveryOption | null {
	return value === "pickup" || value === "delivery" || value === "ship"
		? value
		: null;
}

export function assertInventoryFulfillmentLineSelection(input: {
	requestedLineItemIds?: number[] | null;
	selectedLineItemIds: number[];
}) {
	if (!input.requestedLineItemIds?.length) return;
	const selectedIds = new Set(input.selectedLineItemIds);
	const invalidIds = Array.from(new Set(input.requestedLineItemIds)).filter(
		(id) => !selectedIds.has(id),
	);
	if (invalidIds.length > 0) {
		throw new InventoryFulfillmentPolicyError(
			"INVENTORY_FULFILLMENT_LINE_SELECTION_INVALID",
			"One or more selected inventory lines do not belong to this sale.",
		);
	}
}
