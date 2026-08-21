import crypto from "node:crypto";

export const ACTIVE_REFUND_PROVIDER_STATUSES = [
	"not_submitted",
	"pending",
] as const;
export const COMPLETED_REFUND_PROVIDER_STATUS = "completed" as const;

export type RefundAllocationInput = {
	salesOrderId: number;
	principalCents: number;
	cccCents?: number;
	tipCents?: number;
	originalSalesPaymentId?: number | null;
};

export type RefundMoneyInput = {
	principalCents: number;
	cccCents?: number;
	tipCents?: number;
};

export function refundTotalCents(input: RefundMoneyInput) {
	return input.principalCents + (input.cccCents || 0) + (input.tipCents || 0);
}

export function remainingRefundableCents(input: {
	paymentAmountCents: number;
	completedRefundCents: number;
	reservedRefundCents: number;
}) {
	return Math.max(
		0,
		input.paymentAmountCents -
			input.completedRefundCents -
			input.reservedRefundCents,
	);
}

export function assertRefundIntent(input: {
	paymentStatus: string;
	paidAt?: Date | null;
	remainingCents: number;
	money: RefundMoneyInput;
	allocations: RefundAllocationInput[];
	now?: Date;
}) {
	if (input.paymentStatus.toUpperCase() !== "COMPLETED") {
		throw new Error("Only completed Square payments can be refunded.");
	}
	if (!input.paidAt) throw new Error("The Square payment date is unavailable.");
	const now = input.now || new Date();
	const oneYearAgo = new Date(now);
	oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
	if (input.paidAt < oneYearAgo) {
		throw new Error("Square payments older than one year cannot be refunded.");
	}
	const total = refundTotalCents(input.money);
	if (!Number.isSafeInteger(total) || total <= 0) {
		throw new Error("Refund amount must be greater than zero.");
	}
	if (total > input.remainingCents) {
		throw new Error("Refund amount exceeds the remaining refundable amount.");
	}
	if (!input.allocations.length) {
		throw new Error("At least one sales order allocation is required.");
	}
	const seen = new Set<number>();
	let principal = 0;
	let ccc = 0;
	let tip = 0;
	for (const allocation of input.allocations) {
		if (seen.has(allocation.salesOrderId)) {
			throw new Error("Each sales order can be allocated only once.");
		}
		seen.add(allocation.salesOrderId);
		for (const value of [
			allocation.principalCents,
			allocation.cccCents || 0,
			allocation.tipCents || 0,
		]) {
			if (!Number.isSafeInteger(value) || value < 0) {
				throw new Error(
					"Refund allocations must use non-negative whole cents.",
				);
			}
		}
		principal += allocation.principalCents;
		ccc += allocation.cccCents || 0;
		tip += allocation.tipCents || 0;
	}
	if (
		principal !== input.money.principalCents ||
		ccc !== (input.money.cccCents || 0) ||
		tip !== (input.money.tipCents || 0)
	) {
		throw new Error("Refund allocations must equal every refund component.");
	}
	return { totalCents: total };
}

export function createRefundIdempotencyKey() {
	return `gnd-refund-${crypto.randomUUID()}`.slice(0, 45);
}

export function normalizeSquareRefundStatus(status?: string | null) {
	switch (status?.toUpperCase()) {
		case "COMPLETED":
			return "completed" as const;
		case "PENDING":
			return "pending" as const;
		case "FAILED":
			return "failed" as const;
		case "REJECTED":
			return "rejected" as const;
		default:
			return "unknown" as const;
	}
}

export function nextApplicationStatus(input: {
	origin: string;
	providerStatus: string;
	hasAllocations: boolean;
	currentApplicationStatus?: string;
}) {
	if (input.currentApplicationStatus === "applied") return "applied" as const;
	if (["failed", "rejected"].includes(input.providerStatus)) {
		return "apply_failed" as const;
	}
	if (input.providerStatus !== "completed") return "reserved" as const;
	if (input.origin === "external" && !input.hasAllocations) {
		return "awaiting_allocation" as const;
	}
	return "ready_to_apply" as const;
}
