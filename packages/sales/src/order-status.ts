export const SALES_ORDER_LIFECYCLE_STATUSES = [
	"awaiting_production",
	"production_queued",
	"in_production",
	"ready_to_fulfill",
	"fulfillment_queued",
	"packing",
	"packed",
	"in_transit",
	"fulfilled",
	"cancelled",
	"unknown",
] as const;

export type SalesOrderLifecycleStatus =
	(typeof SALES_ORDER_LIFECYCLE_STATUSES)[number];

export type SalesOrderLifecycleStatusTone =
	| "slate"
	| "amber"
	| "blue"
	| "violet"
	| "indigo"
	| "cyan"
	| "teal"
	| "sky"
	| "emerald"
	| "rose"
	| "stone";

export type SalesOrderLifecycleStatusMeta = {
	label: string;
	tone: SalesOrderLifecycleStatusTone;
	badgeClassName: string;
};

export type SalesOrderLifecycleStatusInput = {
	orderStatus?: string | null;
	productionStatus?: string | null;
	legacyProductionStatus?: string | null;
	fulfillmentStatus?: string | null;
	legacyFulfillmentStatus?: string | null;
	hasProductionWork?: boolean | null;
	packed?: QtyLike | number | null;
	pendingPacking?: QtyLike | number | null;
	pendingDispatch?: QtyLike | number | null;
	packables?: QtyLike | number | null;
};

type QtyLike = {
	total?: number | string | null;
	qty?: number | string | null;
};

export const SALES_ORDER_LIFECYCLE_STATUS_META = {
	awaiting_production: {
		label: "Awaiting production",
		tone: "slate",
		badgeClassName: "bg-slate-100 text-slate-700",
	},
	production_queued: {
		label: "Production queued",
		tone: "amber",
		badgeClassName: "bg-amber-100 text-amber-700",
	},
	in_production: {
		label: "In production",
		tone: "blue",
		badgeClassName: "bg-blue-100 text-blue-700",
	},
	ready_to_fulfill: {
		label: "Ready to fulfill",
		tone: "violet",
		badgeClassName: "bg-violet-100 text-violet-700",
	},
	fulfillment_queued: {
		label: "Fulfillment queued",
		tone: "indigo",
		badgeClassName: "bg-indigo-100 text-indigo-700",
	},
	packing: {
		label: "Packing",
		tone: "cyan",
		badgeClassName: "bg-cyan-100 text-cyan-700",
	},
	packed: {
		label: "Packed",
		tone: "teal",
		badgeClassName: "bg-teal-100 text-teal-700",
	},
	in_transit: {
		label: "In transit",
		tone: "sky",
		badgeClassName: "bg-sky-100 text-sky-700",
	},
	fulfilled: {
		label: "Fulfilled",
		tone: "emerald",
		badgeClassName: "bg-emerald-100 text-emerald-700",
	},
	cancelled: {
		label: "Cancelled",
		tone: "rose",
		badgeClassName: "bg-rose-100 text-rose-700",
	},
	unknown: {
		label: "Unknown",
		tone: "stone",
		badgeClassName: "bg-stone-100 text-stone-700",
	},
} satisfies Record<SalesOrderLifecycleStatus, SalesOrderLifecycleStatusMeta>;

const TERMINAL_ORDER_STATUSES = new Set([
	"completed",
	"complete",
	"delivered",
	"fulfilled",
]);
const TRANSIT_ORDER_STATUSES = new Set([
	"in transit",
	"transit",
	"dispatching",
	"dispatched",
]);
const CANCELLED_STATUSES = new Set(["cancelled", "canceled"]);
const TERMINAL_FULFILLMENT_STATUSES = new Set([
	"completed",
	"complete",
	"delivered",
	"fulfilled",
]);
const TRANSIT_FULFILLMENT_STATUSES = new Set([
	"in progress",
	"in-progress",
	"in transit",
	"transit",
	"dispatching",
	"dispatched",
]);
const PACKED_FULFILLMENT_STATUSES = new Set(["packed"]);
const PACKING_FULFILLMENT_STATUSES = new Set([
	"packing",
	"packing queue",
	"partially packed",
]);
const QUEUED_FULFILLMENT_STATUSES = new Set([
	"queue",
	"queued",
	"fulfillment queue",
	"dispatch queue",
]);
const COMPLETED_PRODUCTION_STATUSES = new Set([
	"completed",
	"complete",
	"ready",
]);
const ACTIVE_PRODUCTION_STATUSES = new Set([
	"in progress",
	"in-production",
	"in production",
	"started",
	"start",
	"producing",
]);
const QUEUED_PRODUCTION_STATUSES = new Set([
	"queue",
	"queued",
	"assigned",
	"scheduled",
]);
const NO_PRODUCTION_REQUIRED_STATUSES = new Set([
	"n/a",
	"na",
	"not applicable",
	"none",
]);

export function getSalesOrderLifecycleStatus(
	input: SalesOrderLifecycleStatusInput,
): SalesOrderLifecycleStatus {
	const orderStatus = normalizeStatus(input.orderStatus);
	const productionStatus = firstMeaningfulStatus(
		input.productionStatus,
		input.legacyProductionStatus,
	);
	const fulfillmentStatus = firstMeaningfulStatus(
		input.fulfillmentStatus,
		input.legacyFulfillmentStatus,
	);
	const packedTotal = qtyTotal(input.packed);
	const pendingPackingTotal = qtyTotal(input.pendingPacking);

	if (
		TERMINAL_ORDER_STATUSES.has(orderStatus) ||
		TERMINAL_FULFILLMENT_STATUSES.has(fulfillmentStatus)
	) {
		return "fulfilled";
	}

	if (
		CANCELLED_STATUSES.has(orderStatus) ||
		CANCELLED_STATUSES.has(fulfillmentStatus)
	) {
		return "cancelled";
	}

	if (
		TRANSIT_ORDER_STATUSES.has(orderStatus) ||
		TRANSIT_FULFILLMENT_STATUSES.has(fulfillmentStatus)
	) {
		return "in_transit";
	}

	if (PACKED_FULFILLMENT_STATUSES.has(fulfillmentStatus)) {
		return "packed";
	}

	if (PACKING_FULFILLMENT_STATUSES.has(fulfillmentStatus)) {
		return "packing";
	}

	if (packedTotal > 0 && pendingPackingTotal > 0) {
		return "packing";
	}

	if (packedTotal > 0 && pendingPackingTotal === 0) {
		return "packed";
	}

	if (QUEUED_FULFILLMENT_STATUSES.has(fulfillmentStatus)) {
		return "fulfillment_queued";
	}

	if (
		COMPLETED_PRODUCTION_STATUSES.has(productionStatus) ||
		NO_PRODUCTION_REQUIRED_STATUSES.has(productionStatus) ||
		input.hasProductionWork === false
	) {
		return "ready_to_fulfill";
	}

	if (ACTIVE_PRODUCTION_STATUSES.has(productionStatus)) {
		return "in_production";
	}

	if (QUEUED_PRODUCTION_STATUSES.has(productionStatus)) {
		return "production_queued";
	}

	if (orderStatus === "unknown" || productionStatus === "unknown") {
		return "unknown";
	}

	return "awaiting_production";
}

export function getSalesOrderLifecycleStatusInfo(
	input: SalesOrderLifecycleStatusInput,
) {
	const status = getSalesOrderLifecycleStatus(input);
	const meta = SALES_ORDER_LIFECYCLE_STATUS_META[status];

	return {
		status,
		label: meta.label,
		tone: meta.tone,
		badgeClassName: meta.badgeClassName,
	};
}

export function getSalesOrderLifecycleStatusLabel(
	status: SalesOrderLifecycleStatus,
) {
	return SALES_ORDER_LIFECYCLE_STATUS_META[status].label;
}

export function getSalesOrderLifecycleStatusTone(
	status: SalesOrderLifecycleStatus,
) {
	return SALES_ORDER_LIFECYCLE_STATUS_META[status].tone;
}

export function getSalesOrderLifecycleStatusBadgeClassName(
	status: SalesOrderLifecycleStatus,
) {
	return SALES_ORDER_LIFECYCLE_STATUS_META[status].badgeClassName;
}

function firstMeaningfulStatus(...values: (string | null | undefined)[]) {
	for (const value of values) {
		const normalized = normalizeStatus(value);
		if (normalized) return normalized;
	}
	return "";
}

function normalizeStatus(status?: string | null) {
	return String(status || "")
		.trim()
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ");
}

function qtyTotal(value?: QtyLike | number | null) {
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	if (!value) return 0;

	const total = Number(value.total ?? value.qty ?? 0);
	return Number.isFinite(total) ? total : 0;
}
