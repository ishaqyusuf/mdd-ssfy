import type { SalesOrderLifecycleStatus } from "@gnd/sales/order-status";

export type SalesOrderStatusMenuAction =
	| "production_completed"
	| "fulfilled"
	| "production_administrative_override"
	| "fulfillment_administrative_override"
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
		"administratively_completed",
		"fulfilled",
	]);

const FULFILLMENT_STARTED_LIFECYCLE_STATUSES =
	new Set<SalesOrderLifecycleStatus>([
		"fulfillment_queued",
		"packing",
		"packed",
		"in_transit",
		"administratively_completed",
		"fulfilled",
	]);

export function getSalesOrderStatusMenuActions({
	status,
	hasFulfillmentDispatch = false,
}: {
	status: SalesOrderLifecycleStatus;
	productionStatus?: string | null;
	hasFulfillmentDispatch?: boolean;
}): SalesOrderStatusMenuItem[] {
	if (status === "unknown" || status === "conflict") {
		return [
			{
				action: "production_administrative_override",
				label: "Production completed",
			},
			{
				action: "fulfillment_administrative_override",
				label: "Fulfilled",
			},
		];
	}
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

	if (fulfillmentStarted || hasFulfillmentDispatch) {
		actions.push({
			action: "cancel_fulfillment",
			label: "Cancel Fulfillment",
		});
	}

	return actions;
}
