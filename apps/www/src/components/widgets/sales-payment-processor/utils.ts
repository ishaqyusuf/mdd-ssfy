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
		salesPaymentMethods.find((method) => {
			const normalizedLabel = method.label
				.toLowerCase()
				.replaceAll("_", "-")
				.replaceAll(" ", "-");
			return method.value === normalized || normalizedLabel === normalized;
		})?.value || null
	);
}

export function resolveDefaultPaymentMethod(
	sales: { id: number; paymentMethod?: string | null }[],
	selectedIds: number[],
	options?: {
		recentPaymentMethod?: string | null;
		terminalEnabled?: boolean;
	},
) {
	const isAllowed = (paymentMethod?: string | null) => {
		const normalized = normalizePaymentMethod(paymentMethod);
		if (!normalized) return null;
		if (normalized === "terminal" && options?.terminalEnabled === false) {
			return null;
		}
		return normalized;
	};
	const selectedSalesById = new Map(sales.map((sale) => [sale.id, sale]));
	const selectedPaymentMethod = selectedIds.length
		? selectedIds
				.map((id) => selectedSalesById.get(id)?.paymentMethod)
				.find((paymentMethod) => isAllowed(paymentMethod))
		: null;
	const orderPaymentMethod = sales
		.map((sale) => sale.paymentMethod)
		.find((paymentMethod) => isAllowed(paymentMethod));

	return (
		isAllowed(selectedPaymentMethod) ||
		isAllowed(orderPaymentMethod) ||
		isAllowed(options?.recentPaymentMethod) ||
		"credit-card"
	);
}

export function buildPrintRequests(input: {
	salesIds: number[];
	shouldPrintInvoice?: boolean | null;
	shouldPrintPackingSlip?: boolean | null;
}): PendingPrintRequest[] {
	const requests: PendingPrintRequest[] = [];

	if (input.shouldPrintInvoice && input.shouldPrintPackingSlip) {
		requests.push({
			mode: "invoice,packing-slip",
			salesIds: input.salesIds,
			windowRef: null,
		});
		return requests;
	}

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

export function calculatePaymentChannelChargePreview(input: {
	paymentMethod?: string | null;
	amount?: number | string | null;
	cccPercentage?: number | string | null;
}) {
	const normalizedMethod = normalizePaymentMethod(input.paymentMethod);
	const baseAmount = Math.round(Number(input.amount || 0) * 100) / 100;
	const percentage = Math.max(0, Number(input.cccPercentage ?? 3.5));
	const applies =
		normalizedMethod === "credit-card" ||
		normalizedMethod === "link" ||
		normalizedMethod === "terminal";
	const feeAmount = applies
		? Math.round(((baseAmount * percentage) / 100) * 100) / 100
		: 0;

	return {
		applies,
		baseAmount,
		percentage,
		feeAmount,
		chargeAmount: Math.round((baseAmount + feeAmount) * 100) / 100,
	};
}

export function calculatePaymentPlanPreview(input: {
	paymentMethod?: string | null;
	selectedBalance?: number | string | null;
	externalAmount?: number | string | null;
	walletBalance?: number | string | null;
	useWallet?: boolean | null;
	cccPercentage?: number | string | null;
}) {
	const selectedBalance =
		Math.round(Number(input.selectedBalance || 0) * 100) / 100;
	const walletBalance = Math.max(0, Number(input.walletBalance || 0));
	const walletApplied = input.useWallet
		? Math.round(Math.min(walletBalance, selectedBalance) * 100) / 100
		: 0;
	const remainingAfterWallet =
		Math.round(Math.max(selectedBalance - walletApplied, 0) * 100) / 100;
	const externalAmount =
		input.paymentMethod === "wallet"
			? 0
			: Math.round(Number(input.externalAmount || 0) * 100) / 100;
	const walletCreditAmount =
		Math.round(Math.max(externalAmount - remainingAfterWallet, 0) * 100) / 100;
	const feeBaseAmount =
		Math.round(Math.min(externalAmount, remainingAfterWallet) * 100) / 100;
	const charge = calculatePaymentChannelChargePreview({
		amount: feeBaseAmount,
		cccPercentage: input.cccPercentage,
		paymentMethod: input.paymentMethod,
	});

	return {
		selectedBalance,
		walletApplied,
		remainingAfterWallet,
		externalAmount,
		walletCreditAmount,
		...charge,
		chargeAmount: Math.round((externalAmount + charge.feeAmount) * 100) / 100,
	};
}

export function formatElapsedTime(seconds?: number | null) {
	if (seconds == null) return "00:00";
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(
		remainingSeconds,
	).padStart(2, "0")}`;
}
