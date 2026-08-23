import type { SalesHandoffTriggerPolicy } from "@gnd/settings";
import type { OrderPaymentProjection } from "./payment-system/contracts";

export type SalesHandoffOrderLifecycle = "ACTIVE" | "CANCELLED" | "TERMINAL";

/**
 * A canonical, identity-bearing point in the payment projection timeline.
 *
 * Loaders build these points from canonical ledger/allocation identities after
 * payment status, refund, void, and legacy-mirror reconciliation has already
 * happened. Qualification deliberately does not reinterpret raw receipt rows.
 */
export interface SalesHandoffSettlementPoint {
	id: string;
	netSettledAmount: number;
	occurredAt: Date | string;
}

export type SalesHandoffPaymentProjection = Pick<
	OrderPaymentProjection,
	| "grandTotal"
	| "totalAllocated"
	| "totalRefunded"
	| "totalVoided"
	| "amountDue"
> & { salesOrderId: number };

export interface SalesHandoffPaymentFacts {
	orderType: "order" | "quote" | string;
	lifecycle: SalesHandoffOrderLifecycle;
	paymentTerm?: string | null;
	projection: SalesHandoffPaymentProjection;
	settlementTimeline?: SalesHandoffSettlementPoint[] | null;
	fullyPaidAt?: Date | string | null;
}

export type SalesHandoffQualificationReason =
	| "QUALIFIED"
	| "COD_EXCLUDED"
	| "NON_OPERATIONAL_ORDER"
	| "NO_NET_RECEIPTS"
	| "PAYMENT_THRESHOLD_NOT_REACHED"
	| "POSITIVE_AMOUNT_DUE"
	| "ZERO_TOTAL_EXCLUDED";

export interface SalesHandoffQualification {
	qualified: boolean;
	qualifiedAt: string | null;
	reason: SalesHandoffQualificationReason;
	netReceiptsCents: number;
	percentagePaid: number;
	policyRevision: number;
}

type NormalizedSettlementPoint = {
	id: string;
	netSettledCents: number;
	occurredAt: string;
};

function moneyToCents(value: number | null | undefined) {
	return Number.isFinite(Number(value))
		? Math.max(0, Math.round(Number(value) * 100))
		: 0;
}

function signedMoneyToCents(value: number | null | undefined) {
	return Number.isFinite(Number(value))
		? Math.round(Number(value) * 100)
		: null;
}

function toIso(value?: Date | string | null) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function latestIso(...values: Array<Date | string | null | undefined>) {
	let latest: string | null = null;
	for (const value of values) {
		const iso = toIso(value);
		if (iso && (!latest || iso > latest)) latest = iso;
	}
	return latest;
}

function canonicalSettlementTimeline(facts: SalesHandoffPaymentFacts) {
	const byIdentity = new Map<string, NormalizedSettlementPoint>();
	for (const point of facts.settlementTimeline || []) {
		const id = String(point.id || "").trim();
		const occurredAt = toIso(point.occurredAt);
		if (!id || !occurredAt) continue;
		const normalized = {
			id,
			netSettledCents: moneyToCents(point.netSettledAmount),
			occurredAt,
		};
		const current = byIdentity.get(id);
		// Multiple legacy surfaces can represent one canonical allocation. Keep
		// one deterministic point by its stable identity instead of double-counting.
		if (!current || normalized.occurredAt < current.occurredAt) {
			byIdentity.set(id, normalized);
		}
	}
	return [...byIdentity.values()].sort(
		(left, right) =>
			left.occurredAt.localeCompare(right.occurredAt) ||
			left.id.localeCompare(right.id),
	);
}

function thresholdReachedAt(
	points: NormalizedSettlementPoint[],
	requiredCents: number,
) {
	if (requiredCents <= 0) return null;
	let reachedAt: string | null = null;
	let wasBelowThreshold = true;
	for (const point of points) {
		const isBelowThreshold = point.netSettledCents < requiredCents;
		if (wasBelowThreshold && !isBelowThreshold) reachedAt = point.occurredAt;
		if (isBelowThreshold) reachedAt = null;
		wasBelowThreshold = isBelowThreshold;
	}
	return reachedAt;
}

function percentagePaid(netReceiptsCents: number, orderTotalCents: number) {
	return orderTotalCents > 0
		? Math.floor((netReceiptsCents * 10_000) / orderTotalCents) / 100
		: 0;
}

function rejectedQualification(input: {
	reason: SalesHandoffQualificationReason;
	netReceiptsCents: number;
	orderTotalCents: number;
	policyRevision: number;
}): SalesHandoffQualification {
	return {
		qualified: false,
		qualifiedAt: null,
		reason: input.reason,
		netReceiptsCents: input.netReceiptsCents,
		percentagePaid: percentagePaid(
			input.netReceiptsCents,
			input.orderTotalCents,
		),
		policyRevision: input.policyRevision,
	};
}

export function qualifySalesHandoff(input: {
	policy: SalesHandoffTriggerPolicy;
	payment: SalesHandoffPaymentFacts;
}): SalesHandoffQualification {
	const { payment, policy } = input;
	const orderTotalCents = moneyToCents(payment.projection.grandTotal);
	const netReceiptsCents = Math.max(
		0,
		moneyToCents(payment.projection.totalAllocated) -
			moneyToCents(payment.projection.totalRefunded) -
			moneyToCents(payment.projection.totalVoided),
	);
	const timeline = canonicalSettlementTimeline(payment);
	const base = {
		netReceiptsCents,
		orderTotalCents,
		policyRevision: policy.revision,
	};

	if (payment.orderType !== "order" || payment.lifecycle !== "ACTIVE") {
		return rejectedQualification({ ...base, reason: "NON_OPERATIONAL_ORDER" });
	}
	if (
		String(payment.paymentTerm || "")
			.trim()
			.toUpperCase() === "COD"
	) {
		return rejectedQualification({ ...base, reason: "COD_EXCLUDED" });
	}
	if (orderTotalCents <= 0) {
		return rejectedQualification({ ...base, reason: "ZERO_TOTAL_EXCLUDED" });
	}

	let qualified = false;
	let reason: SalesHandoffQualificationReason = "QUALIFIED";
	let evidenceAt: string | null = null;

	switch (policy.mode) {
		case "FULLY_PAID": {
			const amountDueCents = signedMoneyToCents(payment.projection.amountDue);
			qualified = amountDueCents !== null && amountDueCents <= 0;
			reason = qualified ? "QUALIFIED" : "POSITIVE_AMOUNT_DUE";
			evidenceAt = toIso(payment.fullyPaidAt);
			break;
		}
		case "ANY_PAYMENT": {
			qualified = netReceiptsCents > 0;
			reason = qualified ? "QUALIFIED" : "NO_NET_RECEIPTS";
			evidenceAt = thresholdReachedAt(timeline, 1);
			break;
		}
		case "PAYMENT_PERCENTAGE": {
			const percentage = policy.percentage || 100;
			qualified = netReceiptsCents * 100 >= orderTotalCents * percentage;
			reason = qualified ? "QUALIFIED" : "PAYMENT_THRESHOLD_NOT_REACHED";
			evidenceAt = thresholdReachedAt(
				timeline,
				Math.ceil((orderTotalCents * percentage) / 100),
			);
			break;
		}
	}

	if (!qualified) return rejectedQualification({ ...base, reason });

	return {
		qualified: true,
		qualifiedAt: latestIso(evidenceAt, policy.changedAt),
		reason: "QUALIFIED",
		netReceiptsCents,
		percentagePaid: percentagePaid(netReceiptsCents, orderTotalCents),
		policyRevision: policy.revision,
	};
}
