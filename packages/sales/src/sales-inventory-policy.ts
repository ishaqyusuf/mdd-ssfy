import type { SalesOrderLifecycleStatus } from "./order-status";

export type SalesInventoryOverviewSetupMode =
	| "active"
	| "legacy_status_locked"
	| "not_configured"
	| "completed_readonly";

export type SalesInventoryOperationMode =
	| "active"
	| "legacy_status_locked"
	| "not_configured"
	| "completed_readonly"
	| "cancelled_readonly";

export type SalesInventoryOperationPolicy = {
	mode: SalesInventoryOperationMode;
	isReadOnly: boolean;
	reason: string | null;
	capabilities: {
		canSync: boolean;
		canCreateInbound: boolean;
		canAllocateStock: boolean;
		canMarkAvailable: boolean;
		canConfigureTracking: boolean;
	};
};

export type SalesInventoryFulfillmentStatusInput = {
	deliveries?: Array<{
		status?: string | null;
		_count?: {
			items?: number | null;
		} | null;
	}> | null;
	stats?: Array<{
		type?: string | null;
		status?: string | null;
		percentage?: number | null;
	}> | null;
};

export type SalesInventoryRequirementDisplayStatus =
	| "required"
	| "not_applicable";

export type SalesInventoryRequirementDisplay = {
	status: SalesInventoryRequirementDisplayStatus;
	label: string;
	shortLabel: string;
	isApplicable: boolean;
	canEditInboundStatus: boolean;
};

const TRACKING_REPAIR_BOUNDARY_STATUSES = new Set<SalesOrderLifecycleStatus>([
	"ready_to_fulfill",
	"fulfillment_queued",
	"packing",
	"packed",
	"in_transit",
	"fulfilled",
	"cancelled",
]);

function normalizeLifecycleInputStatus(status?: string | null) {
	return String(status || "")
		.trim()
		.toLowerCase()
		.replace(/[_-]+/g, " ");
}

function readonlyPolicy(
	mode: "completed_readonly" | "cancelled_readonly" | "legacy_status_locked",
	reason: string,
): SalesInventoryOperationPolicy {
	return {
		mode,
		isReadOnly: true,
		reason,
		capabilities: {
			canSync: false,
			canCreateInbound: false,
			canAllocateStock: false,
			canMarkAvailable: false,
			canConfigureTracking: false,
		},
	};
}

export function resolveSalesInventoryOverviewSetupMode(input: {
	lifecycleStatus: SalesOrderLifecycleStatus;
	inventoryRowCount: number;
	inventoryStatus?: string | null;
}): SalesInventoryOverviewSetupMode {
	if (input.inventoryRowCount > 0) return "active";
	if (input.lifecycleStatus === "fulfilled") return "completed_readonly";
	if (input.inventoryStatus) return "legacy_status_locked";
	return "not_configured";
}

export function resolveSalesInventoryOperationPolicy(input: {
	lifecycleStatus: SalesOrderLifecycleStatus;
	setupMode: SalesInventoryOverviewSetupMode;
}): SalesInventoryOperationPolicy {
	if (input.lifecycleStatus === "fulfilled") {
		return readonlyPolicy(
			"completed_readonly",
			"This order is fulfilled, so inventory is locked for review and repair only.",
		);
	}

	if (input.lifecycleStatus === "cancelled") {
		return readonlyPolicy(
			"cancelled_readonly",
			"This order is cancelled, so inventory is locked for review and repair only.",
		);
	}

	if (input.setupMode === "completed_readonly") {
		return readonlyPolicy(
			"completed_readonly",
			"This completed order was not previously configured for inventory.",
		);
	}

	if (input.setupMode === "legacy_status_locked") {
		return readonlyPolicy(
			"legacy_status_locked",
			"This order has a manual inbound status. Reset or intentionally override that status before configuring inventory.",
		);
	}

	const isConfigured = input.setupMode === "active";

	return {
		mode: input.setupMode,
		isReadOnly: false,
		reason: null,
		capabilities: {
			canSync: input.setupMode === "not_configured",
			canCreateInbound: isConfigured,
			canAllocateStock: isConfigured,
			canMarkAvailable: isConfigured,
			canConfigureTracking: isConfigured,
		},
	};
}

export function resolveSalesInventoryFulfillmentStatus(
	input: SalesInventoryFulfillmentStatusInput,
) {
	const deliveriesWithItems = (input.deliveries || []).filter(
		(delivery) => Number(delivery._count?.items || 0) > 0,
	);
	const completedDelivery = deliveriesWithItems.find(
		(delivery) =>
			normalizeLifecycleInputStatus(delivery.status) === "completed",
	);
	if (completedDelivery) return "completed";

	const completedDispatchStat = (input.stats || []).find(
		(stat) =>
			stat.type === "dispatchCompleted" && Number(stat.percentage || 0) >= 100,
	);
	if (completedDispatchStat) return "completed";

	const activeDelivery = deliveriesWithItems.find(
		(delivery) =>
			!!delivery.status &&
			normalizeLifecycleInputStatus(delivery.status) !== "cancelled",
	);
	if (activeDelivery?.status) return activeDelivery.status;

	const activeDispatchStat = (input.stats || []).find(
		(stat) =>
			(stat.type === "dispatchInProgress" ||
				stat.type === "dispatchAssigned") &&
			Number(stat.percentage || 0) > 0,
	);
	return activeDispatchStat?.status ?? null;
}

export function resolveSalesInventoryRequirementDisplay(input: {
	trackingPolicy?: string | null;
	requiredQty?: number | null;
}): SalesInventoryRequirementDisplay {
	const requiresTrackedStock =
		input.trackingPolicy === "tracked" && Number(input.requiredQty || 0) > 0;

	if (!requiresTrackedStock) {
		return {
			status: "not_applicable",
			label: "Not Applicable",
			shortLabel: "N/A",
			isApplicable: false,
			canEditInboundStatus: false,
		};
	}

	return {
		status: "required",
		label: "Required",
		shortLabel: "Required",
		isApplicable: true,
		canEditInboundStatus: true,
	};
}

export function hasPassedInventoryTrackingRepairBoundary(
	status: SalesOrderLifecycleStatus,
) {
	return TRACKING_REPAIR_BOUNDARY_STATUSES.has(status);
}
