import { differenceInCalendarDays, startOfDay } from "date-fns";

import { addMoney, roundMoney } from "../domain/money";
import { buildLegacyOrderPaymentProjection } from "../domain/order-payment-projection";

export const SALES_FINANCE_AGING_BUCKETS = [
	"current",
	"1_30",
	"31_60",
	"61_90",
	"90_plus",
] as const;

export type SalesFinanceAgingBucket =
	(typeof SALES_FINANCE_AGING_BUCKETS)[number];

type CustomerIdentity = {
	id?: number | null;
	businessName?: string | null;
	name?: string | null;
};

type UserIdentity = {
	name?: string | null;
	email?: string | null;
};

export type SalesFinanceReceivableSource = {
	id: number;
	orderId: string;
	slug?: string | null;
	createdAt?: Date | null;
	paymentDueDate?: Date | null;
	paymentTerm?: string | null;
	grandTotal?: number | null;
	amountDue?: number | null;
	invoiceStatus?: string | null;
	status?: string | null;
	customer?: CustomerIdentity | null;
	billingAddress?: {
		name?: string | null;
		email?: string | null;
		phoneNo?: string | null;
	} | null;
	salesRep?: UserIdentity | null;
	payments?: Array<{
		id?: number | null;
		amount: number | null;
		status?: string | null;
		createdAt?: Date | null;
		transaction?: {
			txId?: string | null;
			paymentMethod?: string | null;
		} | null;
	}> | null;
};

export type SalesFinanceReceivablePayment = {
	id: number | null;
	amount: number;
	status: string;
	receivedAt: Date | null;
	reference: string | null;
	paymentMethod: string | null;
};

export type SalesFinanceReceivable = {
	id: number;
	orderNo: string;
	slug: string | null;
	createdAt: Date | null;
	dueAt: Date | null;
	paymentTerm: string | null;
	customerId: number | null;
	customerName: string | null;
	customerEmail: string | null;
	customerPhone: string | null;
	salesRepName: string | null;
	invoiceStatus: string;
	orderStatus: string | null;
	grandTotal: number;
	paidAmount: number;
	amountDue: number;
	storedAmountDue: number;
	balanceDifference: number;
	isBalanceReconciled: boolean;
	daysOverdue: number | null;
	agingBucket: SalesFinanceAgingBucket;
	isOverdue: boolean;
	payments: SalesFinanceReceivablePayment[];
};

export function getSalesFinanceAgingBucket(
	dueAt: Date | null | undefined,
	asOf: Date,
): {
	agingBucket: SalesFinanceAgingBucket;
	daysOverdue: number | null;
	isOverdue: boolean;
} {
	if (!dueAt) {
		return {
			agingBucket: "current",
			daysOverdue: null,
			isOverdue: false,
		};
	}

	const daysOverdue = Math.max(
		differenceInCalendarDays(startOfDay(asOf), startOfDay(dueAt)),
		0,
	);

	if (daysOverdue === 0) {
		return { agingBucket: "current", daysOverdue: 0, isOverdue: false };
	}
	if (daysOverdue <= 30) {
		return { agingBucket: "1_30", daysOverdue, isOverdue: true };
	}
	if (daysOverdue <= 60) {
		return { agingBucket: "31_60", daysOverdue, isOverdue: true };
	}
	if (daysOverdue <= 90) {
		return { agingBucket: "61_90", daysOverdue, isOverdue: true };
	}
	return { agingBucket: "90_plus", daysOverdue, isOverdue: true };
}

function cleanIdentity(value?: string | null) {
	const cleaned = value?.trim();
	return cleaned || null;
}

export function projectSalesFinanceReceivable(
	source: SalesFinanceReceivableSource,
	asOf = new Date(),
): SalesFinanceReceivable {
	const projection = buildLegacyOrderPaymentProjection({
		salesOrderId: source.id,
		grandTotal: source.grandTotal,
		payments: source.payments,
	});
	const grandTotal = roundMoney(source.grandTotal);
	const storedAmountDue = roundMoney(source.amountDue);
	const usesLegacyStoredPaidBalance =
		grandTotal > 0 &&
		source.amountDue != null &&
		storedAmountDue <= 0 &&
		(source.payments?.length || 0) === 0;
	const amountDue = usesLegacyStoredPaidBalance ? 0 : projection.amountDue;
	const balanceDifference = roundMoney(storedAmountDue - amountDue);
	const aging = getSalesFinanceAgingBucket(source.paymentDueDate, asOf);

	return {
		id: source.id,
		orderNo: source.orderId,
		slug: cleanIdentity(source.slug),
		createdAt: source.createdAt || null,
		dueAt: source.paymentDueDate || null,
		paymentTerm: cleanIdentity(source.paymentTerm),
		customerId: source.customer?.id || null,
		customerName:
			cleanIdentity(source.customer?.businessName) ||
			cleanIdentity(source.customer?.name) ||
			cleanIdentity(source.billingAddress?.name),
		customerEmail: cleanIdentity(source.billingAddress?.email),
		customerPhone: cleanIdentity(source.billingAddress?.phoneNo),
		salesRepName:
			cleanIdentity(source.salesRep?.name) ||
			cleanIdentity(source.salesRep?.email),
		invoiceStatus:
			cleanIdentity(source.invoiceStatus) ||
			(amountDue <= 0 ? "paid" : aging.isOverdue ? "overdue" : "outstanding"),
		orderStatus: cleanIdentity(source.status),
		grandTotal,
		paidAmount: Math.max(roundMoney(grandTotal - amountDue), 0),
		amountDue,
		storedAmountDue,
		balanceDifference,
		isBalanceReconciled: Math.abs(balanceDifference) < 0.01,
		...aging,
		payments: (source.payments || []).map((payment) => ({
			id: payment.id || null,
			amount: roundMoney(payment.amount),
			status: cleanIdentity(payment.status) || "unknown",
			receivedAt: payment.createdAt || null,
			reference: cleanIdentity(payment.transaction?.txId),
			paymentMethod: cleanIdentity(payment.transaction?.paymentMethod),
		})),
	};
}

export function summarizeSalesFinanceReceivables(
	receivables: SalesFinanceReceivable[],
) {
	const open = receivables.filter((receivable) => receivable.amountDue > 0);
	const bucketAmounts = Object.fromEntries(
		SALES_FINANCE_AGING_BUCKETS.map((bucket) => [bucket, 0]),
	) as Record<SalesFinanceAgingBucket, number>;
	const bucketCounts = Object.fromEntries(
		SALES_FINANCE_AGING_BUCKETS.map((bucket) => [bucket, 0]),
	) as Record<SalesFinanceAgingBucket, number>;

	for (const receivable of open) {
		bucketAmounts[receivable.agingBucket] = addMoney(
			bucketAmounts[receivable.agingBucket],
			receivable.amountDue,
		);
		bucketCounts[receivable.agingBucket] += 1;
	}

	const overdueAmount = open
		.filter((receivable) => receivable.isOverdue)
		.reduce((total, receivable) => addMoney(total, receivable.amountDue), 0);

	return {
		receivableCount: open.length,
		customerCount: new Set(
			open.map((receivable) => receivable.customerId).filter(Boolean),
		).size,
		totalOutstanding: open.reduce(
			(total, receivable) => addMoney(total, receivable.amountDue),
			0,
		),
		overdueAmount,
		currentAmount: bucketAmounts.current,
		unreconciledCount: open.filter(
			(receivable) => !receivable.isBalanceReconciled,
		).length,
		bucketAmounts,
		bucketCounts,
	};
}
