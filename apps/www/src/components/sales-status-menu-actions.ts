import type { SalesOrderLifecycleStatus } from "@gnd/sales/order-status";

export type SalesOrderStatusMenuAction =
	| "production_completed"
	| "fulfilled"
	| "cancel_production"
	| "cancel_fulfillment";

export type SalesOrderStatusMenuItem = {
	action: SalesOrderStatusMenuAction;
	label: string;
	disabled?: boolean;
};

type FulfillmentDispatch = {
	id: number;
	status?: string | null;
};

const PRODUCTION_COMPLETED_LIFECYCLE_STATUSES =
	new Set<SalesOrderLifecycleStatus>([
		"ready_to_fulfill",
		"fulfillment_queued",
		"packing",
		"packed",
		"in_transit",
		"fulfilled",
	]);

const FULFILLMENT_STARTED_LIFECYCLE_STATUSES =
	new Set<SalesOrderLifecycleStatus>([
		"fulfillment_queued",
		"packing",
		"packed",
		"in_transit",
		"fulfilled",
	]);

const COMPLETED_PRODUCTION_STATUSES = new Set([
	"complete",
	"completed",
	"ready",
]);

function normalizeStatus(status?: string | null) {
	return status?.trim().toLowerCase() || "";
}

export function getCancellableFulfillmentDispatchIds(
	deliveries: readonly FulfillmentDispatch[],
) {
	return deliveries
		.filter((delivery) => normalizeStatus(delivery.status) !== "cancelled")
		.map((delivery) => delivery.id);
}

export function getSalesOrderStatusMenuActions({
	status,
	productionStatus,
}: {
	status: SalesOrderLifecycleStatus;
	productionStatus?: string | null;
}): SalesOrderStatusMenuItem[] {
	const productionCompleted =
		PRODUCTION_COMPLETED_LIFECYCLE_STATUSES.has(status);
	const fulfillmentStarted = FULFILLMENT_STARTED_LIFECYCLE_STATUSES.has(status);
	const actions: SalesOrderStatusMenuItem[] = [
		{
			action: "production_completed",
			label: "Production completed",
			...(productionCompleted ? { disabled: true } : {}),
		},
		{
			action: "fulfilled",
			label: "Fulfilled",
			...(status === "fulfilled" ? { disabled: true } : {}),
		},
	];

	if (
		status === "ready_to_fulfill" &&
		COMPLETED_PRODUCTION_STATUSES.has(normalizeStatus(productionStatus))
	) {
		actions.push({
			action: "cancel_production",
			label: "Cancel Production",
		});
	}

	if (fulfillmentStarted) {
		actions.push({
			action: "cancel_fulfillment",
			label: "Cancel Fulfillment",
		});
	}

	return actions;
}
