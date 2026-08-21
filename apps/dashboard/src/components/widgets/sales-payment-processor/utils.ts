import { salesPaymentMethods } from "@/utils/constants";
import type { SalesPaymentMethods } from "@gnd/sales/constants";
import type { PaymentOverlayState, PendingPrintRequest } from "./types";

export const formatPaymentAmount = (value?: number | string | null) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));

type PaymentTerminal = {
	label?: string | null;
	status?: string | null;
	value?: string | null;
};

export const normalizePaymentTerminalId = (value?: string | null) =>
	String(value || "").replace(/^device:/, "");

export function isAvailablePaymentTerminal(terminal?: PaymentTerminal | null) {
	return (
		Boolean(terminal?.value) &&
		(terminal?.status === "AVAILABLE" || terminal?.status === "PAIRED")
	);
}

export function resolveAvailablePaymentTerminal<T extends PaymentTerminal>(
	terminals: T[] | null | undefined,
	deviceId?: string | null,
): T | undefined {
	if (!deviceId) return undefined;
	const normalizedDeviceId = normalizePaymentTerminalId(deviceId);

	return terminals?.find(
		(terminal) =>
			isAvailablePaymentTerminal(terminal) &&
			normalizePaymentTerminalId(terminal.value) === normalizedDeviceId,
	);
}

export function orderPaymentTerminals<T extends PaymentTerminal>(terminals: T[]) {
	return [...terminals].sort(
		(left, right) =>
			Number(isAvailablePaymentTerminal(right)) -
			Number(isAvailablePaymentTerminal(left)),
	);
}

export function buildPaymentMethodControlModel<
	TTerminal extends PaymentTerminal,
>(input: {
	deviceId?: string | null;
	method: SalesPaymentMethods;
	methods: Array<{ label?: string; value?: SalesPaymentMethods }>;
	terminals: TTerminal[];
}) {
	const methods = input.methods.flatMap((option) =>
		option.value
			? [{ label: option.label || option.value, value: option.value }]
			: [],
	);
	const terminals = orderPaymentTerminals(input.terminals);
	const selectedTerminal = terminals.find(
		(terminal) =>
			Boolean(input.deviceId) &&
			normalizePaymentTerminalId(terminal.value) ===
				normalizePaymentTerminalId(input.deviceId),
	);
	const availableTerminalCount = terminals.filter(
		isAvailablePaymentTerminal,
	).length;
	const methodLabel =
		methods.find((option) => option.value === input.method)?.label ||
		"Payment method";

	return {
		availableTerminalCount,
		methods,
		presentation: input.method === "check" ? ("check" as const) : ("menu" as const),
		selectedTerminal,
		terminals,
		triggerLabel:
			input.method === "terminal"
				? selectedTerminal?.label || "Select terminal"
				: methodLabel,
	};
}

export function getPaymentMethodControlFeedback(input: {
	availableTerminalCount: number;
	checkError?: string | null;
	method: SalesPaymentMethods;
	terminalError?: string | null;
	terminalInvalid?: boolean;
	terminalPaymentsEnabled: boolean;
}) {
	if (input.method === "check") {
		return { error: input.checkError || null, invalid: Boolean(input.checkError) };
	}

	const terminalAvailabilityError = input.terminalPaymentsEnabled
		? input.terminalError ||
			(input.availableTerminalCount === 0
				? "No online Square terminals are available."
				: null)
		: null;

	return {
		error: terminalAvailabilityError,
		invalid: input.method === "terminal" && Boolean(input.terminalInvalid),
	};
}

function getPrintPreparationDescription(printMode?: string | null) {
	if (printMode === "packing-slip") {
		return "Payment recorded. Preparing the packing slip.";
	}
	if (printMode === "invoice,packing-slip") {
		return "Payment recorded. Preparing the invoice and packing slip.";
	}
	return "Payment recorded. Preparing the invoice.";
}

export function getPaymentStatusOverlayContent(
	state: Exclude<PaymentOverlayState, "form">,
	options?: { error?: string | null; printMode?: string | null },
) {
	const titles: Record<Exclude<PaymentOverlayState, "form">, string> = {
		applying: "Applying payment",
		creating: "Sending to terminal",
		awaiting: "Waiting for payment",
		recording: "Recording payment",
		printing: "Preparing to print",
		success: "Payment complete",
		print_failed: "Payment complete",
		failed: "Payment failed",
	};
	const descriptions: Record<Exclude<PaymentOverlayState, "form">, string> = {
		applying: "Recording this payment and updating the selected orders.",
		creating: "Preparing this charge on the selected Square terminal.",
		awaiting: "Complete the payment on the Square terminal.",
		recording: "Payment was received. We are applying it to the order.",
		printing: getPrintPreparationDescription(options?.printMode),
		success: options?.printMode
			? "The print dialog is ready."
			: "The sale payment was recorded successfully.",
		print_failed: "The payment was recorded, but printing needs attention.",
		failed: options?.error || "The payment could not be completed.",
	};

	return { description: descriptions[state], title: titles[state] };
}

export function sanitizePaymentMethodFields<
	T extends {
		checkNo?: string | null;
		deviceId?: string | null;
		deviceName?: string | null;
		terminalPaymentSession?: unknown;
	},
>(data: T, paymentMethod?: string | null) {
	const isTerminalPayment = paymentMethod === "terminal";
	return {
		...data,
		checkNo: paymentMethod === "check" ? data.checkNo?.trim() || null : null,
		deviceId: isTerminalPayment ? data.deviceId : null,
		deviceName: isTerminalPayment ? data.deviceName : null,
		terminalPaymentSession: isTerminalPayment
			? data.terminalPaymentSession
			: null,
	};
}

export function resolveDefaultPaymentTerminal<T extends PaymentTerminal>(
	terminals: T[] | null | undefined,
	preferredDeviceId?: string | null,
): T | undefined {
	const availableTerminals =
		terminals?.filter(isAvailablePaymentTerminal) || [];
	const preferredTerminal = resolveAvailablePaymentTerminal(
		availableTerminals,
		preferredDeviceId,
	);
	if (preferredTerminal) return preferredTerminal;
	return availableTerminals.length === 1 ? availableTerminals[0] : undefined;
}

type PaymentSaleWithId<T extends { id?: number | null }> = T & { id: number };

function indexPaymentSalesById<T extends { id?: number | null }>(sales: T[]) {
	return new Map(
		sales.flatMap((sale) =>
			typeof sale.id === "number"
				? ([[sale.id, sale as PaymentSaleWithId<T>]] as const)
				: [],
		),
	);
}

export function getListedPaymentSales<T extends { id?: number | null }>(
	sales: T[],
	listedIds: number[],
): PaymentSaleWithId<T>[] {
	const salesById = indexPaymentSalesById(sales);
	const seen = new Set<number>();

	return listedIds.flatMap((id) => {
		if (seen.has(id)) return [];
		seen.add(id);
		const sale = salesById.get(id);
		return sale ? [sale] : [];
	});
}

export function getAvailablePaymentSales<T extends { id?: number | null }>(
	sales: T[],
	listedIds: number[],
): PaymentSaleWithId<T>[] {
	const listedIdSet = new Set(listedIds);
	return sales.filter(
		(sale): sale is PaymentSaleWithId<T> =>
			typeof sale.id === "number" && !listedIdSet.has(sale.id),
	);
}

export function canNotifyPaymentCustomer(
	sales: Array<{ customerEmail?: string | null }>,
) {
	return (
		sales.length > 0 &&
		sales.every((sale) => Boolean(sale.customerEmail?.trim()))
	);
}

export function getListedPaymentAmount<
	T extends {
		id?: number | null;
		amountDue?: number | string | null;
	},
>(sales: T[], listedIds: number[]) {
	return getListedPaymentSales(sales, listedIds).reduce(
		(total, sale) => total + Number(sale.amountDue || 0),
		0,
	);
}

function normalizePaymentMethod(value?: string | null) {
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
	sales: { id?: number | null; paymentMethod?: string | null }[],
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
	const selectedSalesById = indexPaymentSalesById(sales);
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
			salesIds: [...input.salesIds],
		});
		return requests;
	}

	if (input.shouldPrintInvoice) {
		requests.push({
			mode: "invoice",
			salesIds: [...input.salesIds],
		});
	}

	if (input.shouldPrintPackingSlip) {
		requests.push({
			mode: "packing-slip",
			salesIds: [...input.salesIds],
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
