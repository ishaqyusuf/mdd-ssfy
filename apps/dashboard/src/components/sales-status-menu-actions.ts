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

export function getSalesOrderStatusMenuActions({
	status,
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

	if (status === "ready_to_fulfill") {
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
