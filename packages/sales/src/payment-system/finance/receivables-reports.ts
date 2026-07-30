import { addMoney } from "../domain/money";
import {
	type SalesFinanceAgingBucket,
	type SalesFinanceReceivable,
	summarizeSalesFinanceReceivables,
} from "./receivables";
import type {
	SalesFinanceReportColumn,
	SalesFinanceReportSheet,
	SalesFinanceWorkbookReport,
} from "./reports";

export const SALES_FINANCE_RECEIVABLE_REPORT_TYPES = [
	"receivables-aging",
	"receivables-customers",
] as const;

export type SalesFinanceReceivableReportType =
	(typeof SALES_FINANCE_RECEIVABLE_REPORT_TYPES)[number];

export type SalesFinanceReceivableReportContext = {
	from?: Date | null;
	to?: Date | null;
	q?: string | null;
	agingBuckets?: SalesFinanceAgingBucket[] | null;
};

const definitions: Record<
	SalesFinanceReceivableReportType,
	{ title: string; description: string; fileSlug: string }
> = {
	"receivables-aging": {
		title: "Receivables Aging",
		description:
			"Outstanding sales invoices grouped by due-date aging, with customer and balance evidence.",
		fileSlug: "receivables-aging",
	},
	"receivables-customers": {
		title: "Receivables by Customer",
		description:
			"Customer-level outstanding balances split across current and overdue aging buckets.",
		fileSlug: "receivables-by-customer",
	},
};

const sourceColumns: SalesFinanceReportColumn[] = [
	{ key: "invoice", label: "Invoice", type: "text", width: 18 },
	{ key: "customer", label: "Customer", type: "text", width: 30 },
	{ key: "invoiceDate", label: "Invoice Date", type: "date-time", width: 18 },
	{ key: "dueDate", label: "Due Date", type: "date-time", width: 18 },
	{ key: "paymentTerm", label: "Payment Term", type: "text", width: 18 },
	{ key: "aging", label: "Aging", type: "text", width: 16 },
	{ key: "daysOverdue", label: "Days Overdue", type: "integer", width: 14 },
	{ key: "invoiceTotal", label: "Invoice Total", type: "money", width: 16 },
	{ key: "paid", label: "Paid", type: "money", width: 16 },
	{ key: "outstanding", label: "Outstanding", type: "money", width: 16 },
	{ key: "status", label: "Status", type: "text", width: 16 },
	{ key: "salesRep", label: "Sales Rep", type: "text", width: 24 },
	{ key: "reconciliation", label: "Reconciliation", type: "text", width: 18 },
	{
		key: "balanceDifference",
		label: "Balance Difference",
		type: "money",
		width: 18,
	},
];

function agingLabel(bucket: SalesFinanceAgingBucket) {
	return (
		{
			current: "Current",
			"1_30": "1–30 days",
			"31_60": "31–60 days",
			"61_90": "61–90 days",
			"90_plus": "90+ days",
		} satisfies Record<SalesFinanceAgingBucket, string>
	)[bucket];
}

function sourceRows(receivables: SalesFinanceReceivable[]) {
	return receivables.map((receivable) => ({
		invoice: receivable.orderNo,
		customer: receivable.customerName || "Unnamed customer",
		invoiceDate: receivable.createdAt?.toISOString() || "",
		dueDate: receivable.dueAt?.toISOString() || "",
		paymentTerm: receivable.paymentTerm || "",
		aging: agingLabel(receivable.agingBucket),
		daysOverdue: receivable.daysOverdue,
		invoiceTotal: receivable.grandTotal,
		paid: receivable.paidAmount,
		outstanding: receivable.amountDue,
		status: receivable.invoiceStatus,
		salesRep: receivable.salesRepName || "",
		reconciliation: receivable.isBalanceReconciled
			? "Reconciled"
			: "Needs review",
		balanceDifference: receivable.balanceDifference,
	}));
}

function contextSheet(
	context: SalesFinanceReceivableReportContext,
	definition: { title: string; description: string },
	generatedAt: Date,
): SalesFinanceReportSheet {
	return {
		name: "Report Context",
		columns: [
			{ key: "field", label: "Field", type: "text", width: 24 },
			{ key: "value", label: "Value", type: "text", width: 58 },
		],
		rows: [
			{ field: "Report", value: definition.title },
			{ field: "Purpose", value: definition.description },
			{ field: "Generated At", value: generatedAt.toISOString() },
			{
				field: "Due Date From",
				value: context.from?.toISOString() || "All",
			},
			{ field: "Due Date To", value: context.to?.toISOString() || "All" },
			{ field: "Search", value: context.q || "None" },
			{
				field: "Aging",
				value: context.agingBuckets?.length
					? context.agingBuckets.map(agingLabel).join(", ")
					: "All",
			},
		],
	};
}

function summarySheet(
	receivables: SalesFinanceReceivable[],
): SalesFinanceReportSheet {
	const summary = summarizeSalesFinanceReceivables(receivables);

	return {
		name: "Summary",
		columns: [
			{ key: "invoices", label: "Invoices", type: "integer", width: 12 },
			{ key: "customers", label: "Customers", type: "integer", width: 12 },
			{
				key: "outstanding",
				label: "Outstanding",
				type: "money",
				width: 16,
			},
			{ key: "current", label: "Current", type: "money", width: 16 },
			{ key: "days1To30", label: "1–30 Days", type: "money", width: 16 },
			{ key: "days31To60", label: "31–60 Days", type: "money", width: 16 },
			{ key: "days61To90", label: "61–90 Days", type: "money", width: 16 },
			{ key: "days90Plus", label: "90+ Days", type: "money", width: 16 },
			{
				key: "needsReview",
				label: "Needs Review",
				type: "integer",
				width: 14,
			},
		],
		rows: [
			{
				invoices: summary.receivableCount,
				customers: summary.customerCount,
				outstanding: summary.totalOutstanding,
				current: summary.bucketAmounts.current,
				days1To30: summary.bucketAmounts["1_30"],
				days31To60: summary.bucketAmounts["31_60"],
				days61To90: summary.bucketAmounts["61_90"],
				days90Plus: summary.bucketAmounts["90_plus"],
				needsReview: summary.unreconciledCount,
			},
		],
	};
}

function customerSheet(
	receivables: SalesFinanceReceivable[],
): SalesFinanceReportSheet {
	type CustomerRow = {
		customer: string;
		invoices: number;
		outstanding: number;
		current: number;
		days1To30: number;
		days31To60: number;
		days61To90: number;
		days90Plus: number;
		oldestDays: number;
	};
	type CustomerAgingKey =
		| "current"
		| "days1To30"
		| "days31To60"
		| "days61To90"
		| "days90Plus";
	const customerAgingKeys = {
		current: "current",
		"1_30": "days1To30",
		"31_60": "days31To60",
		"61_90": "days61To90",
		"90_plus": "days90Plus",
	} satisfies Record<SalesFinanceAgingBucket, CustomerAgingKey>;
	const groups = new Map<string, CustomerRow>();

	for (const receivable of receivables) {
		const customer = receivable.customerName || "Unnamed customer";
		const key = receivable.customerId
			? `customer-${receivable.customerId}`
			: `name-${customer}`;
		const current = groups.get(key) || {
			customer,
			invoices: 0,
			outstanding: 0,
			current: 0,
			days1To30: 0,
			days31To60: 0,
			days61To90: 0,
			days90Plus: 0,
			oldestDays: 0,
		};
		current.invoices += 1;
		current.outstanding = addMoney(current.outstanding, receivable.amountDue);
		current.oldestDays = Math.max(
			current.oldestDays,
			receivable.daysOverdue || 0,
		);
		const bucketKey = customerAgingKeys[receivable.agingBucket];
		current[bucketKey] = addMoney(current[bucketKey], receivable.amountDue);
		groups.set(key, current);
	}

	return {
		name: "By Customer",
		columns: [
			{ key: "customer", label: "Customer", type: "text", width: 32 },
			{ key: "invoices", label: "Invoices", type: "integer", width: 12 },
			{
				key: "outstanding",
				label: "Outstanding",
				type: "money",
				width: 16,
			},
			{ key: "current", label: "Current", type: "money", width: 16 },
			{ key: "days1To30", label: "1–30 Days", type: "money", width: 16 },
			{ key: "days31To60", label: "31–60 Days", type: "money", width: 16 },
			{ key: "days61To90", label: "61–90 Days", type: "money", width: 16 },
			{ key: "days90Plus", label: "90+ Days", type: "money", width: 16 },
			{
				key: "oldestDays",
				label: "Oldest Days",
				type: "integer",
				width: 14,
			},
		],
		rows: Array.from(groups.values()).sort(
			(left, right) => right.outstanding - left.outstanding,
		),
	};
}

export function buildSalesFinanceReceivablesReport(input: {
	type: SalesFinanceReceivableReportType;
	receivables: SalesFinanceReceivable[];
	context: SalesFinanceReceivableReportContext;
	generatedAt?: Date;
}): SalesFinanceWorkbookReport {
	const definition = definitions[input.type];
	const generatedAt = input.generatedAt || new Date();
	const sourceSheet: SalesFinanceReportSheet = {
		name: "Outstanding Invoices",
		columns: sourceColumns,
		rows: sourceRows(input.receivables),
	};

	return {
		type: input.type,
		title: definition.title,
		description: definition.description,
		fileSlug: definition.fileSlug,
		generatedAt,
		rowCount: input.receivables.length,
		sheets: [
			contextSheet(input.context, definition, generatedAt),
			summarySheet(input.receivables),
			...(input.type === "receivables-customers"
				? [customerSheet(input.receivables), sourceSheet]
				: [sourceSheet]),
		],
	};
}
