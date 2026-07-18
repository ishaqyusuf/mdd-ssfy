import { roundMoney } from "../../payment-system/domain/money";
import { calculatePaymentChannelCharge } from "../../payment-system/domain/payment-channel-charge";
import type { PrintSalesData } from "../query";

type PaymentRecord = PrintSalesData["payments"][number];

export type PrintPaymentFooterStateKind =
	| "unpaid-card-estimate"
	| "unpaid-no-card"
	| "paid-single-full-card"
	| "paid-single-full-non-card"
	| "partial-or-mixed";

export interface PrintPaymentChargeDetail {
	principalAmount: number;
	cccAmount: number;
	customerChargedAmount: number;
	percentage: number | null;
	paymentMethod: string | null;
	source: "estimated" | "recorded";
}

export interface PrintPaymentFooterState {
	kind: PrintPaymentFooterStateKind;
	orderTotal: number;
	amountDue: number;
	principalPaid: number;
	selectedPaymentMethod: string | null;
	estimatedDueCharge: PrintPaymentChargeDetail | null;
	recordedCardCharges: PrintPaymentChargeDetail[];
	latestPaymentDate: Date | null;
}

export interface PrintPaymentFooterSummary {
	cardFees: number;
	totalPaid: number;
}

export function getPrintPaymentFooterSummary(
	state: Pick<
		PrintPaymentFooterState,
		"principalPaid" | "recordedCardCharges"
	>,
): PrintPaymentFooterSummary {
	const cardFees = roundMoney(
		state.recordedCardCharges
			.filter((charge) => charge.source === "recorded")
			.reduce((total, charge) => total + charge.cccAmount, 0),
	);

	return {
		cardFees,
		totalPaid: roundMoney(state.principalPaid + cardFees),
	};
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function finiteNumber(value: unknown): number | null {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

function normalizePaymentMethod(value: unknown): string | null {
	if (typeof value !== "string" || !value.trim()) return null;
	return value.trim();
}

function isSuccessfulPayment(payment: PaymentRecord) {
	return String(payment.status || "").toLowerCase() === "success";
}

function getPaymentMetas(payment: PaymentRecord) {
	const transaction = "transaction" in payment ? payment.transaction : null;
	const squarePayments =
		"squarePayments" in payment ? payment.squarePayments : null;
	return [
		asRecord(payment.meta),
		asRecord(transaction?.meta),
		asRecord(squarePayments?.meta),
	].filter((meta): meta is Record<string, unknown> => Boolean(meta));
}

function getPaymentMethod(payment: PaymentRecord) {
	const transaction = "transaction" in payment ? payment.transaction : null;
	const squarePayments =
		"squarePayments" in payment ? payment.squarePayments : null;
	for (const value of [
		transaction?.paymentMethod,
		squarePayments?.paymentMethod,
		...getPaymentMetas(payment).map((meta) => meta.paymentMethod),
	]) {
		const normalized = normalizePaymentMethod(value);
		if (normalized) return normalized;
	}
	return null;
}

function readChargeFromMeta(
	meta: Record<string, unknown>,
	fallbackPrincipal: number,
	fallbackPaymentMethod: string | null,
): PrintPaymentChargeDetail | null {
	const charges = Array.isArray(meta.paymentCharges) ? meta.paymentCharges : [];
	const cccCharge = charges
		.map((charge) => asRecord(charge))
		.find((charge) => charge?.type === "ccc" || charge?.label === "C.C.C");
	const cccAmount = finiteNumber(cccCharge?.amount ?? meta.feeAmount);
	if (!cccAmount || cccAmount <= 0) return null;

	const metadataPrincipal = finiteNumber(cccCharge?.baseAmount ?? meta.salesAmount);
	if (
		metadataPrincipal != null &&
		Math.abs(roundMoney(metadataPrincipal) - roundMoney(fallbackPrincipal)) > 0.01
	) {
		return null;
	}
	const principalAmount = roundMoney(metadataPrincipal ?? fallbackPrincipal);
	const customerChargedAmount = roundMoney(
		finiteNumber(meta.customerChargeAmount) ?? principalAmount + cccAmount,
	);
	return {
		principalAmount,
		cccAmount: roundMoney(cccAmount),
		customerChargedAmount,
		percentage: finiteNumber(cccCharge?.percentage ?? meta.cccPercentage),
		paymentMethod: normalizePaymentMethod(meta.paymentMethod) ?? fallbackPaymentMethod,
		source: "recorded",
	};
}

function getRecordedCardCharge(
	payment: PaymentRecord,
): PrintPaymentChargeDetail | null {
	const principalAmount = roundMoney(payment.amount || 0);
	if (principalAmount <= 0) return null;
	const paymentMethod = getPaymentMethod(payment);
	for (const meta of getPaymentMetas(payment)) {
		const detail = readChargeFromMeta(meta, principalAmount, paymentMethod);
		if (detail) return detail;
	}
	return null;
}

function getSelectedPaymentMethod(sale: PrintSalesData) {
	const meta = asRecord(sale.meta);
	const newSalesForm = asRecord(meta?.newSalesForm);
	const form = asRecord(newSalesForm?.form);
	return (
		normalizePaymentMethod(form?.paymentMethod) ??
		normalizePaymentMethod(meta?.payment_option) ??
		normalizePaymentMethod(meta?.paymentOption)
	);
}

function getCccPercentage(sale: PrintSalesData) {
	const meta = asRecord(sale.meta);
	return finiteNumber(meta?.ccc_percentage);
}

function toChargeDetail(input: {
	paymentMethod: string | null;
	paymentAmount: number;
	cccPercentage: number | null;
}): PrintPaymentChargeDetail | null {
	const charge = calculatePaymentChannelCharge({
		paymentMethod: input.paymentMethod,
		paymentAmount: input.paymentAmount,
		cccPercentage: input.cccPercentage,
	});
	if (!charge.amount) return null;
	return {
		principalAmount: charge.baseAmount,
		cccAmount: charge.amount,
		customerChargedAmount: charge.chargeAmount,
		percentage: charge.percentage,
		paymentMethod: input.paymentMethod,
		source: "estimated",
	};
}

export function getPrintPaymentFooterState(
	sale: PrintSalesData,
): PrintPaymentFooterState {
	const orderTotal = roundMoney(sale.grandTotal || 0);
	const amountDue = roundMoney(sale.amountDue || 0);
	const payments = (sale.payments || [])
		.filter((payment) => !payment.deletedAt && isSuccessfulPayment(payment))
		.filter((payment) => roundMoney(payment.amount || 0) > 0);
	const principalPaid = roundMoney(
		payments.reduce((total, payment) => total + Number(payment.amount || 0), 0),
	);
	const selectedPaymentMethod = getSelectedPaymentMethod(sale);
	const cccPercentage = getCccPercentage(sale);
	const recordedCardCharges = payments
		.map(getRecordedCardCharge)
		.filter((detail): detail is PrintPaymentChargeDetail => Boolean(detail));
	const latestPaymentDate =
		payments
			.map((payment) => payment.createdAt)
			.filter((date): date is Date => date instanceof Date)
			.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
	const estimatedDueCharge = toChargeDetail({
		paymentMethod: selectedPaymentMethod,
		paymentAmount: amountDue,
		cccPercentage,
	});

	if (!payments.length) {
		return {
			kind: estimatedDueCharge ? "unpaid-card-estimate" : "unpaid-no-card",
			orderTotal,
			amountDue,
			principalPaid,
			selectedPaymentMethod,
			estimatedDueCharge,
			recordedCardCharges,
			latestPaymentDate,
		};
	}

	const isPaid = amountDue <= 0;
	const hasSinglePayment = payments.length === 1;
	const singlePayment = payments[0];
	const singleRecordedCharge = recordedCardCharges[0] ?? null;
	const singlePaymentMethod = singlePayment ? getPaymentMethod(singlePayment) : null;
	const derivedFullSingleCharge =
		isPaid && hasSinglePayment && !singleRecordedCharge
			? toChargeDetail({
					paymentMethod: singlePaymentMethod ?? selectedPaymentMethod,
					paymentAmount: roundMoney(singlePayment?.amount || 0),
					cccPercentage,
				})
			: null;

	if (isPaid && hasSinglePayment) {
		const fullCardCharge = singleRecordedCharge ?? derivedFullSingleCharge;
		return {
			kind: fullCardCharge
				? "paid-single-full-card"
				: "paid-single-full-non-card",
			orderTotal,
			amountDue,
			principalPaid,
			selectedPaymentMethod,
			estimatedDueCharge: null,
			recordedCardCharges: fullCardCharge ? [fullCardCharge] : [],
			latestPaymentDate,
		};
	}

	return {
		kind: "partial-or-mixed",
		orderTotal,
		amountDue,
		principalPaid,
		selectedPaymentMethod,
		estimatedDueCharge: null,
		recordedCardCharges,
		latestPaymentDate,
	};
}
