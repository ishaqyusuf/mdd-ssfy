import type { SalesPipelineHeadlineCode } from "./sales-pipeline";
import {
	getSalesOrderLifecycleStatusBadgeClassName,
	getSalesOrderLifecycleStatusLabel,
	getSalesOrderLifecycleStatusTone,
} from "./order-status";

export type LegacySalesOrderLifecycleStatusInput = {
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

/**
 * Compatibility-only interpretation for audited operational workflows that
 * have not yet migrated their historical inventory/reversal inputs. Ordinary
 * lifecycle presentation and membership must use SalesPipelineSnapshot.
 */
export function getLegacySalesOrderLifecycleStatus(
	input: LegacySalesOrderLifecycleStatusInput,
): SalesPipelineHeadlineCode {
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

	if (PACKED_FULFILLMENT_STATUSES.has(fulfillmentStatus)) return "packed";
	if (PACKING_FULFILLMENT_STATUSES.has(fulfillmentStatus)) return "packing";
	if (packedTotal > 0 && pendingPackingTotal > 0) return "packing";
	if (packedTotal > 0 && pendingPackingTotal === 0) return "packed";
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

	if (ACTIVE_PRODUCTION_STATUSES.has(productionStatus)) return "in_production";
	if (QUEUED_PRODUCTION_STATUSES.has(productionStatus)) {
		return "production_queued";
	}
	if (orderStatus === "unknown" || productionStatus === "unknown") {
		return "unknown";
	}
	return "awaiting_production";
}

export function getLegacySalesOrderLifecycleStatusInfo(
	input: LegacySalesOrderLifecycleStatusInput,
) {
	const status = getLegacySalesOrderLifecycleStatus(input);
	return {
		status,
		label: getSalesOrderLifecycleStatusLabel(status),
		tone: getSalesOrderLifecycleStatusTone(status),
		badgeClassName: getSalesOrderLifecycleStatusBadgeClassName(status),
	};
}

export function isLegacySalesOrderFulfilled(
	input: LegacySalesOrderLifecycleStatusInput,
) {
	return getLegacySalesOrderLifecycleStatus(input) === "fulfilled";
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
