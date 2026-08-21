import { roundMoney } from "./money";

export type SalesPaymentSummaryMethod =
	| "card"
	| "cash"
	| "check"
	| "zelle"
	| "wire"
	| "wallet"
	| "unclassified";

export type SalesPaymentSummaryInput = {
	id?: number | string | null;
	transactionId?: number | string | null;
	squarePaymentsId?: string | null;
	amount?: number | string | null;
	tip?: number | string | null;
	status?: string | null;
	deletedAt?: Date | string | null;
	meta?: unknown;
	transaction?: {
		id?: number | string | null;
		paymentMethod?: string | null;
		meta?: unknown;
	} | null;
	squarePayments?: {
		id?: string | null;
		paymentId?: string | null;
		paymentMethod?: string | null;
		meta?: unknown;
	} | null;
};

export type SalesPaymentSummaryGroup = {
	method: SalesPaymentSummaryMethod;
	label: string;
	paymentCount: number;
	principalCents: number;
	cccCents: number;
	tipCents: number;
	customerChargedCents: number;
	cccEvidence: "recorded" | "partial" | "unavailable";
};

export type SalesPaymentSummary = {
	paymentCount: number;
	principalCents: number;
	cccCents: number;
	tipCents: number;
	customerChargedCents: number;
	methodLabel: string | null;
	groups: SalesPaymentSummaryGroup[];
};

export type SalesPaymentSummaryLine = {
	key: string;
	kind: "money" | "count";
	label: string;
	value: number;
	method: SalesPaymentSummaryMethod;
};

const SUCCESSFUL_PAYMENT_STATUSES = new Set(["completed", "paid", "success"]);
const METHOD_ORDER: SalesPaymentSummaryMethod[] = [
	"card",
	"cash",
	"check",
	"zelle",
	"wire",
	"wallet",
	"unclassified",
];
const METHOD_LABELS: Record<SalesPaymentSummaryMethod, string> = {
	card: "Card",
	cash: "Cash",
	check: "Check",
	zelle: "Zelle",
	wire: "Wire",
	wallet: "Wallet",
	unclassified: "Other",
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function normalizeText(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function moneyToCents(value: unknown) {
	const numeric = typeof value === "number" ? value : Number(value);
	return Number.isFinite(numeric) ? Math.round(roundMoney(numeric) * 100) : 0;
}

function centsToMoney(value: number) {
	return roundMoney(value / 100);
}

export function normalizeSalesPaymentSummaryMethod(
	value?: string | null,
): SalesPaymentSummaryMethod {
	const normalized = String(value || "")
		.trim()
		.toLowerCase()
		.replaceAll("_", "-");

	if (
		[
			"card",
			"credit-card",
			"credit card",
			"terminal",
			"link",
			"payment-link",
			"payment link",
		].includes(normalized)
	) {
		return "card";
	}
	if (normalized === "cash") return "cash";
	if (normalized === "check" || normalized === "cheque") return "check";
	if (normalized === "zelle") return "zelle";
	if (normalized === "wire" || normalized === "wire transfer") return "wire";
	if (normalized === "wallet") return "wallet";
	return "unclassified";
}

function paymentMetas(payment: SalesPaymentSummaryInput) {
	return [
		asRecord(payment.meta),
		asRecord(payment.transaction?.meta),
		asRecord(payment.squarePayments?.meta),
	].filter((meta): meta is Record<string, unknown> => Boolean(meta));
}

function paymentMethod(payment: SalesPaymentSummaryInput) {
	for (const value of [
		payment.transaction?.paymentMethod,
		payment.squarePayments?.paymentMethod,
		...paymentMetas(payment).map((meta) => meta.paymentMethod),
	]) {
		const normalized = normalizeText(value);
		if (normalized) return normalizeSalesPaymentSummaryMethod(normalized);
	}
	return "unclassified";
}

function receiptKey(payment: SalesPaymentSummaryInput, rowKey: string) {
	for (const [prefix, value] of [
		["transaction", payment.transactionId ?? payment.transaction?.id],
		["provider", payment.squarePayments?.paymentId],
		["square", payment.squarePaymentsId ?? payment.squarePayments?.id],
	] as const) {
		if (value != null && String(value).trim()) return `${prefix}:${value}`;
	}
	return rowKey;
}

function readRecordedCcc(
	payment: SalesPaymentSummaryInput,
	principalCents: number,
) {
	for (const meta of paymentMetas(payment)) {
		const charges = Array.isArray(meta.paymentCharges)
			? meta.paymentCharges
			: [];
		const cccCharge = charges
			.map(asRecord)
			.find(
				(charge) =>
					String(charge?.type || "").toLowerCase() === "ccc" ||
					String(charge?.label || "").toLowerCase() === "c.c.c",
			);
		const cccCents = moneyToCents(cccCharge?.amount ?? meta.feeAmount);
		if (cccCents <= 0) continue;

		const recordedPrincipalValue =
			cccCharge?.baseAmount ?? meta.salesAmount ?? null;
		const recordedPrincipalCents =
			recordedPrincipalValue == null
				? principalCents
				: moneyToCents(recordedPrincipalValue);
		if (Math.abs(recordedPrincipalCents - principalCents) > 1) continue;
		const recordedCustomerChargedCents = moneyToCents(
			meta.customerChargeAmount ?? cccCharge?.customerChargeAmount,
		);
		if (
			!cccCharge &&
			(recordedPrincipalValue == null ||
				recordedCustomerChargedCents < principalCents + cccCents)
		) {
			continue;
		}

		const customerChargedCents =
			recordedCustomerChargedCents || principalCents + cccCents;
		return { cccCents, customerChargedCents };
	}
	return null;
}

type MutableGroup = Omit<
	SalesPaymentSummaryGroup,
	"paymentCount" | "cccEvidence"
> & {
	receipts: Set<string>;
	recordedCccReceipts: Set<string>;
};

export function getSalesPaymentSummary(
	payments: SalesPaymentSummaryInput[] | null | undefined,
): SalesPaymentSummary {
	const groups = new Map<SalesPaymentSummaryMethod, MutableGroup>();
	const seenRows = new Set<string>();
	const seenReceipts = new Set<string>();
	const receiptMethods = new Map<string, SalesPaymentSummaryMethod>();

	for (const [index, payment] of (payments || []).entries()) {
		if (payment.deletedAt) continue;
		if (
			!SUCCESSFUL_PAYMENT_STATUSES.has(
				String(payment.status || "")
					.trim()
					.toLowerCase(),
			)
		) {
			continue;
		}
		const principalCents = moneyToCents(payment.amount);
		if (principalCents <= 0) continue;

		const rowKey =
			payment.id != null ? `payment:${payment.id}` : `row:${index}`;
		if (seenRows.has(rowKey)) continue;
		seenRows.add(rowKey);

		const resolvedReceiptKey = receiptKey(payment, rowKey);
		const method =
			receiptMethods.get(resolvedReceiptKey) ?? paymentMethod(payment);
		receiptMethods.set(resolvedReceiptKey, method);
		seenReceipts.add(resolvedReceiptKey);
		const tipCents = Math.max(0, moneyToCents(payment.tip));
		const charge = readRecordedCcc(payment, principalCents);
		const group = groups.get(method) ?? {
			method,
			label: METHOD_LABELS[method],
			principalCents: 0,
			cccCents: 0,
			tipCents: 0,
			customerChargedCents: 0,
			receipts: new Set<string>(),
			recordedCccReceipts: new Set<string>(),
		};

		group.receipts.add(resolvedReceiptKey);
		group.principalCents += principalCents;
		group.tipCents += tipCents;
		if (charge && !group.recordedCccReceipts.has(resolvedReceiptKey)) {
			group.recordedCccReceipts.add(resolvedReceiptKey);
			group.cccCents += charge.cccCents;
			group.customerChargedCents += Math.max(
				charge.customerChargedCents,
				principalCents + charge.cccCents + tipCents,
			);
		} else {
			group.customerChargedCents += principalCents + tipCents;
		}
		groups.set(method, group);
	}

	const orderedGroups = METHOD_ORDER.flatMap((method) => {
		const group = groups.get(method);
		if (!group) return [];
		const paymentCount = group.receipts.size;
		const cccEvidence = group.cccCents
			? group.recordedCccReceipts.size === paymentCount
				? "recorded"
				: "partial"
			: "unavailable";
		return [
			{
				method: group.method,
				label: group.label,
				paymentCount,
				principalCents: group.principalCents,
				cccCents: group.cccCents,
				tipCents: group.tipCents,
				customerChargedCents: group.customerChargedCents,
				cccEvidence,
			} satisfies SalesPaymentSummaryGroup,
		];
	});
	const total = (
		key: "principalCents" | "cccCents" | "tipCents" | "customerChargedCents",
	) => orderedGroups.reduce((sum, group) => sum + group[key], 0);
	const methodLabel =
		orderedGroups.length === 1
			? orderedGroups[0]?.method === "card"
				? "Credit Card"
				: orderedGroups[0]?.label || null
			: orderedGroups.length > 1
				? `Mixed — ${orderedGroups.map((group) => group.label).join(", ")}`
				: null;

	return {
		paymentCount: seenReceipts.size,
		principalCents: total("principalCents"),
		cccCents: total("cccCents"),
		tipCents: total("tipCents"),
		customerChargedCents: total("customerChargedCents"),
		methodLabel,
		groups: orderedGroups,
	};
}

export function buildSalesPaymentSummaryLines(
	summary: SalesPaymentSummary,
): SalesPaymentSummaryLine[] {
	return summary.groups.flatMap((group) => {
		const lines: SalesPaymentSummaryLine[] = [
			{
				key: `${group.method}-principal`,
				kind: "money",
				label: `${group.label} Payment`,
				value: centsToMoney(group.principalCents),
				method: group.method,
			},
		];
		if (group.cccCents > 0) {
			lines.push({
				key: `${group.method}-ccc`,
				kind: "money",
				label: `C.C.C. on ${group.label} Payment`,
				value: centsToMoney(group.cccCents),
				method: group.method,
			});
		}
		if (group.tipCents > 0) {
			lines.push({
				key: `${group.method}-tip`,
				kind: "money",
				label: `${group.label} Tip`,
				value: centsToMoney(group.tipCents),
				method: group.method,
			});
		}
		if (group.cccCents > 0 || group.tipCents > 0) {
			lines.push({
				key: `${group.method}-charged`,
				kind: "money",
				label:
					group.method === "card"
						? "Charged to Card"
						: `Total ${group.label} Payment`,
				value: centsToMoney(group.customerChargedCents),
				method: group.method,
			});
		}
		if (group.paymentCount > 1) {
			lines.push({
				key: `${group.method}-count`,
				kind: "count",
				label: `${group.label} Payments Made`,
				value: group.paymentCount,
				method: group.method,
			});
		}
		return lines;
	});
}
