import { addMoney, roundMoney, subtractMoney, sumMoney } from "../domain/money";
import { normalizeSalesPaymentSummaryMethod } from "../domain/payment-summary";

export const SALES_FINANCE_PAYMENT_METHODS = [
	"card",
	"check",
	"zelle",
	"cash",
	"wire",
	"unclassified",
] as const;

export type SalesFinancePaymentMethod =
	(typeof SALES_FINANCE_PAYMENT_METHODS)[number];

export const SALES_FINANCE_EXCEPTION_CODES = [
	"missing_customer",
	"unclassified_method",
	"missing_reference",
	"application_mismatch",
	"failed_payment",
] as const;

export type SalesFinanceExceptionCode =
	(typeof SALES_FINANCE_EXCEPTION_CODES)[number];

export const SALES_FINANCE_APPLICATION_STATUSES = [
	"applied",
	"partial",
	"unapplied",
	"overapplied",
] as const;

export type SalesFinanceApplicationStatus =
	(typeof SALES_FINANCE_APPLICATION_STATUSES)[number];

type CustomerIdentity = {
	id?: number | null;
	businessName?: string | null;
	name?: string | null;
};

type UserIdentity = {
	name?: string | null;
	email?: string | null;
};

export type SalesFinanceTransactionSource = {
	id: number;
	txId?: string | null;
	status?: string | null;
	statusNote?: string | null;
	amount: number;
	paymentMethod?: string | null;
	description?: string | null;
	meta?: unknown;
	createdAt?: Date | null;
	author?: UserIdentity | null;
	wallet?: {
		accountNo?: string | null;
		customer?: CustomerIdentity | null;
	} | null;
	squarePayment?: {
		paymentId?: string | null;
		squareOrderId?: string | null;
		paymentMethod?: string | null;
		status?: string | null;
		amount?: number | null;
		tip?: number | null;
		createdBy?: UserIdentity | null;
	} | null;
	refundTx?: Array<{
		refund?: {
			id?: string | null;
			refId?: string | null;
			total?: number | null;
			status?: string | null;
		} | null;
	}>;
	salesPayments?: Array<{
		id: number;
		amount: number;
		status?: string | null;
		note?: string | null;
		meta?: unknown;
		createdAt?: Date | null;
		order: {
			id: number;
			orderId: string;
			subTotal?: number | null;
			customer?: CustomerIdentity | null;
			billingAddress?: {
				name?: string | null;
			} | null;
			salesRep?: UserIdentity | null;
		};
	}>;
};

export type SalesFinanceApplication = {
	id: number;
	orderId: number;
	orderNo: string;
	customerName: string | null;
	amount: number;
	status: string | null;
	note: string | null;
	createdAt: Date | null;
};

export type SalesFinanceTransaction = {
	id: number;
	paymentNo: string;
	receivedAt: Date | null;
	customerId: number | null;
	customerName: string | null;
	accountNo: string | null;
	orderNos: string[];
	salesRepNames: string[];
	description: string | null;
	paymentMethod: SalesFinancePaymentMethod;
	rawPaymentMethod: string | null;
	reference: string | null;
	status: string;
	statusNote: string | null;
	recordedBy: string;
	receivedAmount: number;
	principalAmount: number;
	feeAmount: number;
	refundedAmount: number;
	subTotal: number | null;
	netAmount: number;
	appliedAmount: number;
	unappliedAmount: number;
	overappliedAmount: number;
	applicationStatus: SalesFinanceApplicationStatus;
	exceptionCodes: SalesFinanceExceptionCode[];
	needsReview: boolean;
	applications: SalesFinanceApplication[];
};

const MONEY_EPSILON = 0.009;

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}

function firstString(...values: unknown[]) {
	for (const value of values) {
		if (typeof value === "string" && value.trim()) return value.trim();
		if (typeof value === "number" && Number.isFinite(value)) {
			return String(value);
		}
	}
	return null;
}

function firstMoney(...values: unknown[]) {
	for (const value of values) {
		const parsed =
			typeof value === "number"
				? value
				: typeof value === "string"
					? Number(value)
					: Number.NaN;
		if (Number.isFinite(parsed)) return roundMoney(parsed);
	}
	return null;
}

function customerDisplayName(customer?: CustomerIdentity | null) {
	return customer?.businessName?.trim() || customer?.name?.trim() || null;
}

function uniqueStrings(values: Array<string | null | undefined>) {
	return Array.from(
		new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
	);
}

export function normalizeSalesFinancePaymentMethod(
	value?: string | null,
): SalesFinancePaymentMethod {
	const method = normalizeSalesPaymentSummaryMethod(value);
	return method === "wallet" ? "unclassified" : method;
}

function resolveCustomer(source: SalesFinanceTransactionSource) {
	const walletCustomer = source.wallet?.customer;
	const walletName = customerDisplayName(walletCustomer);
	if (walletName) {
		return {
			customerId: walletCustomer?.id ?? null,
			customerName: walletName,
		};
	}

	const orderCustomers = source.salesPayments?.flatMap((payment) => {
		const directName = customerDisplayName(payment.order.customer);
		const billingName = payment.order.billingAddress?.name?.trim() || null;
		return directName || billingName ? [directName || billingName] : [];
	});
	const names = uniqueStrings(orderCustomers || []);
	const firstCustomer = source.salesPayments?.find(
		(payment) => customerDisplayName(payment.order.customer) != null,
	)?.order.customer;

	return {
		customerId: firstCustomer?.id ?? null,
		customerName: names.length ? names.join(", ") : null,
	};
}

function paymentReference(source: SalesFinanceTransactionSource) {
	const meta = asRecord(source.meta);
	const applicationMeta = source.salesPayments
		?.map((payment) => asRecord(payment.meta))
		.find((value) => Object.keys(value).length);

	return firstString(
		meta.checkNo,
		meta.reference,
		meta.confirmation,
		meta.confirmationNo,
		meta.transactionId,
		applicationMeta?.checkNo,
		applicationMeta?.reference,
		source.squarePayment?.paymentId,
		source.squarePayment?.squareOrderId,
		source.txId,
	);
}

function isSuccessfulStatus(value?: string | null) {
	return ["success", "completed", "paid"].includes(
		String(value || "")
			.trim()
			.toLowerCase(),
	);
}

function isFailedStatus(value?: string | null) {
	return ["failed", "cancelled", "canceled", "declined", "voided"].includes(
		String(value || "")
			.trim()
			.toLowerCase(),
	);
}

export function projectSalesFinanceTransaction(
	source: SalesFinanceTransactionSource,
): SalesFinanceTransaction {
	const meta = asRecord(source.meta);
	const rawPaymentMethod =
		source.paymentMethod || source.squarePayment?.paymentMethod || null;
	const paymentMethod = normalizeSalesFinancePaymentMethod(rawPaymentMethod);
	const customer = resolveCustomer(source);
	const reference = paymentReference(source);
	const transactionAmount = Math.abs(roundMoney(source.amount));
	const squareAmount = Math.abs(roundMoney(source.squarePayment?.amount));
	const explicitReceived = firstMoney(
		meta.customerChargeAmount,
		meta.receivedAmount,
	);
	const receivedAmount = Math.abs(
		explicitReceived ?? (squareAmount || transactionAmount),
	);
	const feeAmount = Math.abs(
		firstMoney(meta.feeAmount, meta.paymentCharges, meta.processingFee) ?? 0,
	);
	const explicitPrincipal = firstMoney(meta.salesAmount, meta.principalAmount);
	const principalAmount = Math.abs(
		explicitPrincipal != null && Math.abs(explicitPrincipal) > MONEY_EPSILON
			? explicitPrincipal
			: subtractMoney(receivedAmount, feeAmount),
	);
	const refundedAmount = sumMoney(
		(source.refundTx || []).map((item) =>
			Math.abs(roundMoney(item.refund?.total)),
		),
	);
	const applications: SalesFinanceApplication[] = (
		source.salesPayments || []
	).map((payment) => ({
		id: payment.id,
		orderId: payment.order.id,
		orderNo: payment.order.orderId,
		customerName:
			customerDisplayName(payment.order.customer) ||
			payment.order.billingAddress?.name?.trim() ||
			null,
		amount: roundMoney(payment.amount),
		status: payment.status || null,
		note: payment.note || null,
		createdAt: payment.createdAt || null,
	}));
	const appliedAmount = sumMoney(
		applications
			.filter((application) => application.amount > 0)
			.map((application) => application.amount),
	);
	const unappliedAmount = Math.max(
		0,
		subtractMoney(principalAmount, appliedAmount),
	);
	const overappliedAmount = Math.max(
		0,
		subtractMoney(appliedAmount, principalAmount),
	);
	const applicationStatus: SalesFinanceApplicationStatus =
		overappliedAmount > MONEY_EPSILON
			? "overapplied"
			: appliedAmount <= MONEY_EPSILON
				? "unapplied"
				: unappliedAmount > MONEY_EPSILON
					? "partial"
					: "applied";
	const exceptionCodes: SalesFinanceExceptionCode[] = [];

	if (!customer.customerName) exceptionCodes.push("missing_customer");
	if (paymentMethod === "unclassified") {
		exceptionCodes.push("unclassified_method");
	}
	if (["check", "wire"].includes(paymentMethod) && !reference) {
		exceptionCodes.push("missing_reference");
	}
	if (unappliedAmount > MONEY_EPSILON || overappliedAmount > MONEY_EPSILON) {
		exceptionCodes.push("application_mismatch");
	}
	if (isFailedStatus(source.status || source.squarePayment?.status)) {
		exceptionCodes.push("failed_payment");
	}

	const recordedBy =
		source.author?.name?.trim() ||
		source.author?.email?.trim() ||
		source.squarePayment?.createdBy?.name?.trim() ||
		source.squarePayment?.createdBy?.email?.trim() ||
		"System";
	const status =
		source.status?.trim() ||
		source.squarePayment?.status?.trim() ||
		(isSuccessfulStatus(source.status) ? "Success" : "Unknown");

	const uniqueOrderSubtotals = Array.from(
		(source.salesPayments || [])
			.reduce((acc, payment) => {
				if (payment.order?.id != null && payment.order?.subTotal != null) {
					acc.set(payment.order.id, roundMoney(payment.order.subTotal));
				}
				return acc;
			}, new Map<number, number>())
			.values(),
	);
	const subTotal =
		uniqueOrderSubtotals.length > 0 ? sumMoney(uniqueOrderSubtotals) : null;

	return {
		id: source.id,
		paymentNo: String(source.id).padStart(5, "0"),
		receivedAt: source.createdAt || null,
		customerId: customer.customerId,
		customerName: customer.customerName,
		accountNo: source.wallet?.accountNo || null,
		orderNos: uniqueStrings(
			(source.salesPayments || []).map((payment) => payment.order.orderId),
		),
		salesRepNames: uniqueStrings(
			(source.salesPayments || []).map(
				(payment) =>
					payment.order.salesRep?.name || payment.order.salesRep?.email || null,
			),
		),
		description: source.description?.trim() || null,
		paymentMethod,
		rawPaymentMethod,
		reference,
		status,
		statusNote: source.statusNote?.trim() || null,
		recordedBy,
		receivedAmount,
		principalAmount,
		feeAmount,
		refundedAmount,
		subTotal,
		netAmount: subtractMoney(receivedAmount, refundedAmount),
		appliedAmount,
		unappliedAmount,
		overappliedAmount,
		applicationStatus,
		exceptionCodes,
		needsReview: exceptionCodes.length > 0,
		applications,
	};
}

export function summarizeSalesFinanceTransactions(
	transactions: SalesFinanceTransaction[],
) {
	return {
		receivedAmount: sumMoney(
			transactions.map((transaction) => transaction.receivedAmount),
		),
		refundedAmount: sumMoney(
			transactions.map((transaction) => transaction.refundedAmount),
		),
		netAmount: sumMoney(
			transactions.map((transaction) => transaction.netAmount),
		),
		feeAmount: sumMoney(
			transactions.map((transaction) => transaction.feeAmount),
		),
		unappliedAmount: sumMoney(
			transactions.map((transaction) => transaction.unappliedAmount),
		),
		transactionCount: transactions.length,
		reviewCount: transactions.filter((transaction) => transaction.needsReview)
			.length,
	};
}
