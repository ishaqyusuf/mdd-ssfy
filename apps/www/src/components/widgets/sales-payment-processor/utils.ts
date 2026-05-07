import { salesPaymentMethods } from "@/utils/constants";
import type { PendingPrintRequest } from "./types";

export const formatPaymentAmount = (value?: number | string | null) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));

export function normalizePaymentMethod(value?: string | null) {
	if (!value) return null;
	const normalized = value
		.toLowerCase()
		.replaceAll("_", "-")
		.replaceAll(" ", "-");

	return (
		salesPaymentMethods.find((method) => method.value === normalized)?.value ||
		null
	);
}

export function resolveDefaultPaymentMethod(
	sales: { id: number; paymentMethod?: string | null }[],
	selectedIds: number[],
) {
	const selectedPaymentMethod = sales.find((sale) =>
		selectedIds.includes(sale.id),
	)?.paymentMethod;
	const firstPaymentMethod = sales.find(
		(sale) => sale.paymentMethod,
	)?.paymentMethod;

	return (
		normalizePaymentMethod(selectedPaymentMethod) ||
		normalizePaymentMethod(firstPaymentMethod) ||
		"terminal"
	);
}

export function buildPrintRequests(input: {
	salesIds: number[];
	shouldPrintInvoice?: boolean | null;
	shouldPrintPackingSlip?: boolean | null;
}): PendingPrintRequest[] {
	const requests: PendingPrintRequest[] = [];

	if (input.shouldPrintInvoice) {
		requests.push({
			mode: "invoice",
			salesIds: input.salesIds,
			windowRef: null,
		});
	}

	if (input.shouldPrintPackingSlip) {
		requests.push({
			mode: "packing-slip",
			salesIds: input.salesIds,
			windowRef: null,
		});
	}

	return requests;
}

export function formatElapsedTime(seconds?: number | null) {
	if (seconds == null) return "00:00";
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(
		remainingSeconds,
	).padStart(2, "0")}`;
}
