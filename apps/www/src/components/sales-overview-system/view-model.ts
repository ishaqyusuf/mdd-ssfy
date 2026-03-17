"use client";

export function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(Number(value || 0));
}

export function formatPercent(value?: number | null) {
	return `${Math.round(Number(value || 0))}%`;
}

export function formatAddress(
	address?: Record<string, unknown> | string | null,
) {
	if (!address) return "Not provided";
	if (typeof address === "string") return address;

	return [
		address.address,
		address.street,
		address.city,
		address.state,
		address.zipCode,
		address.country,
	]
		.filter(Boolean)
		.join(", ");
}

export function getPaymentBalance(
	invoice?: { total?: number; paid?: number } | null,
) {
	const total = Number(invoice?.total || 0);
	const paid = Number(invoice?.paid || 0);

	return total - paid;
}

export function getProgressValue(value?: number | null) {
	return Math.max(0, Math.min(100, Number(value || 0)));
}

export function getStatusLabel(value?: string | null) {
	if (!value) return "Not set";
	return value.replaceAll("-", " ");
}
