import type { StorefrontAddressInput } from "@api/schemas/storefront-checkout";

type JsonRecord = Record<string, unknown>;

export function canonicalizeStorefrontShippingAddress(
	input: StorefrontAddressInput,
	destination: unknown,
): StorefrontAddressInput {
	const canonical = safeRecord(destination);
	const formattedAddress = String(canonical.formattedAddress || "").trim();
	return {
		...input,
		placeId: String(canonical.placeId || "").trim(),
		formattedAddress,
		address1: String(canonical.address1 || formattedAddress).trim(),
		city: String(canonical.city || "").trim(),
		state: String(canonical.state || canonical.region || "").trim(),
		postalCode: String(canonical.postalCode || "").trim(),
		country: String(canonical.country || "").trim(),
		lat: finiteOrUndefined(canonical.lat),
		lng: finiteOrUndefined(canonical.lng),
	};
}

export function isStorefrontShippingPaymentLocked(
	checkout:
		| { status: string; paymentReference?: string | null }
		| null
		| undefined,
) {
	return Boolean(
		checkout?.paymentReference ||
			checkout?.status === "PAYMENT_PENDING" ||
			checkout?.status === "PAID",
	);
}

export function requiresStorefrontShippingOverrideReason(input: {
	calculatedAmount: number;
	finalAmount: number;
	reviewNote?: string | null;
}) {
	return (
		input.finalAmount !== input.calculatedAmount && !input.reviewNote?.trim()
	);
}

export function buildFinalizedStorefrontCheckoutTotals(
	totalsValue: unknown,
	finalDeliveryAmount: number,
) {
	const totals = safeRecord(totalsValue);
	const subtotal = Number(totals.subtotal || 0);
	const tax = Number(totals.tax || 0);
	const oldDelivery = Number(totals.delivery || 0);
	const orderTotal = roundMoney(subtotal + tax + finalDeliveryAmount);
	const cardFeePercentage = Number(totals.cardFeePercentage || 0);
	const paymentFee = roundMoney(orderTotal * (cardFeePercentage / 100));
	return {
		oldDelivery,
		delta: roundMoney(finalDeliveryAmount - oldDelivery),
		totals: {
			...totals,
			delivery: finalDeliveryAmount,
			orderTotal,
			paymentFee,
			paymentTotal: roundMoney(orderTotal + paymentFee),
		},
	};
}

function finiteOrUndefined(value: unknown) {
	const number = Number(value);
	return Number.isFinite(number) ? number : undefined;
}

function safeRecord(value: unknown): JsonRecord {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as JsonRecord)
		: {};
}

function roundMoney(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}
