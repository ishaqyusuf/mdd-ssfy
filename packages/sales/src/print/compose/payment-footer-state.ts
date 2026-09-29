import { roundMoney } from "../../payment-system/domain/money";
import { calculatePaymentChannelCharge } from "../../payment-system/domain/payment-channel-charge";
import {
	getSalesPaymentSummary,
	type SalesPaymentSummary,
} from "../../payment-system/domain/payment-summary";
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
	refunded: { principal: number; ccc: number; tip: number };
	selectedPaymentMethod: string | null;
	estimatedDueCharge: PrintPaymentChargeDetail | null;
	recordedCardCharges: PrintPaymentChargeDetail[];
	paymentSummary: SalesPaymentSummary;
	latestPaymentDate: Date | null;
}

export interface PrintPaymentFooterSummary {
	cardFees: number;
	totalPaid: number;
}

export function getPrintPaymentFooterSummary(
	state: Pick<
		PrintPaymentFooterState,
		"principalPaid" | "recordedCardCharges" | "refunded"
	>,
): PrintPaymentFooterSummary {
	const cardFees = roundMoney(
		state.recordedCardCharges
			.filter((charge) => charge.source === "recorded")
			.reduce((total, charge) => total + charge.cccAmount, 0) -
			state.refunded.ccc,
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
	return ["completed", "paid", "success"].includes(
		String(payment.status || "").toLowerCase(),
	);
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

	const metadataPrincipal = finiteNumber(
		cccCharge?.baseAmount ?? meta.salesAmount,
	);
	if (
		metadataPrincipal != null &&
		Math.abs(roundMoney(metadataPrincipal) - roundMoney(fallbackPrincipal)) >
			0.01
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
		paymentMethod:
			normalizePaymentMethod(meta.paymentMethod) ?? fallbackPaymentMethod,
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
	const dealerCustomerPayment = (
		sale as PrintSalesData & { dealerCustomerPayment?: { paidAmount: number } }
	).dealerCustomerPayment;
	if (dealerCustomerPayment) {
		return {
			kind: "unpaid-no-card",
			orderTotal,
			amountDue,
			principalPaid: roundMoney(dealerCustomerPayment.paidAmount),
			refunded: { principal: 0, ccc: 0, tip: 0 },
			selectedPaymentMethod: null,
			estimatedDueCharge: null,
			recordedCardCharges: [],
			paymentSummary: getSalesPaymentSummary([]),
			latestPaymentDate: null,
		};
	}
	const settledPayments = (sale.payments || []).filter(
		(payment) => !payment.deletedAt && isSuccessfulPayment(payment),
	);
	const payments = settledPayments.filter(
		(payment) => roundMoney(payment.amount || 0) > 0,
	);
	const refunds = settledPayments.filter(
		(payment) =>
			Number(payment.amount || 0) < 0 || payment.origin === "square_refund",
	);
	const refunded = refunds.reduce(
		(total, payment) => {
			// Use allocation-level metadata, never the shared multi-order transaction total.
			const meta = asRecord(payment.meta);
			return {
				principal: roundMoney(
					total.principal + Math.max(0, -Number(payment.amount || 0)),
				),
				ccc: roundMoney(
					total.ccc +
						(payment.origin === "square_refund"
							? Math.max(0, finiteNumber(meta?.cccCents) ?? 0) / 100
							: 0),
				),
				tip: roundMoney(total.tip + Math.max(0, -Number(payment.tip || 0))),
			};
		},
		{ principal: 0, ccc: 0, tip: 0 },
	);
	const principalPaid = roundMoney(
		payments.reduce(
			(total, payment) => total + Number(payment.amount || 0),
			0,
		) - refunded.principal,
	);
	const paymentSummary = getSalesPaymentSummary(payments);
	const selectedPaymentMethod = getSelectedPaymentMethod(sale);
	const cccPercentage = getCccPercentage(sale);
	const recordedCardCharges = payments
		.map(getRecordedCardCharge)
		.filter((detail): detail is PrintPaymentChargeDetail => Boolean(detail));
	const latestPaymentDate =
		settledPayments
			.map((payment) => payment.createdAt)
			.filter((date): date is Date => date instanceof Date)
			.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
	const estimatedDueCharge = toChargeDetail({
		paymentMethod: selectedPaymentMethod,
		paymentAmount: amountDue,
		cccPercentage,
	});

	if (!payments.length && !refunds.length) {
		return {
			kind: estimatedDueCharge ? "unpaid-card-estimate" : "unpaid-no-card",
			orderTotal,
			amountDue,
			principalPaid,
			refunded,
			selectedPaymentMethod,
			estimatedDueCharge,
			recordedCardCharges,
			paymentSummary,
			latestPaymentDate,
		};
	}

	const isPaid = amountDue <= 0;
	const hasSinglePayment = payments.length === 1 && refunds.length === 0;
	const singlePayment = payments[0];
	const singleRecordedCharge = recordedCardCharges[0] ?? null;
	const singlePaymentMethod = singlePayment
		? getPaymentMethod(singlePayment)
		: null;
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
			refunded,
			selectedPaymentMethod,
			estimatedDueCharge: null,
			recordedCardCharges: fullCardCharge ? [fullCardCharge] : [],
			paymentSummary,
			latestPaymentDate,
		};
	}

	return {
		kind: "partial-or-mixed",
		orderTotal,
		amountDue,
		principalPaid,
		refunded,
		selectedPaymentMethod,
		estimatedDueCharge: null,
		recordedCardCharges,
		paymentSummary,
		latestPaymentDate,
	};
}
