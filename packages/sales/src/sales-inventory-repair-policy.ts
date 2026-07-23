export const AUTO_RELEASABLE_STOCK_ALLOCATION_STATUSES = [
	"pending_review",
	"approved",
	"reserved",
] as const;

export const PROTECTED_STOCK_ALLOCATION_STATUSES = [
	"picked",
	"consumed",
] as const;

export const MUTABLE_INBOUND_DEMAND_STATUSES = ["pending", "ordered"] as const;

export type InboundDemandRepairInput = {
	status?: string | null;
	qtyReceived?: number | null;
	inboundShipmentItemId?: number | null;
};

export function canAutoCancelInboundDemand(input: InboundDemandRepairInput) {
	return (
		MUTABLE_INBOUND_DEMAND_STATUSES.includes(
			input.status as (typeof MUTABLE_INBOUND_DEMAND_STATUSES)[number],
		) &&
		Number(input.qtyReceived || 0) <= 0 &&
		input.inboundShipmentItemId == null
	);
}

export function canAutoReleaseStockAllocation(status?: string | null) {
	return AUTO_RELEASABLE_STOCK_ALLOCATION_STATUSES.includes(
		status as (typeof AUTO_RELEASABLE_STOCK_ALLOCATION_STATUSES)[number],
	);
}

export function requiresInventoryRepairReview(input: {
	demand?: InboundDemandRepairInput;
	allocationStatus?: string | null;
}) {
	if (input.demand && !canAutoCancelInboundDemand(input.demand)) return true;
	if (
		input.allocationStatus != null &&
		!canAutoReleaseStockAllocation(input.allocationStatus)
	) {
		return true;
	}
	return false;
}
