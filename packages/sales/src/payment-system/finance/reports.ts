import { addMoney } from "../domain/money";
import {
	type SalesFinanceTransaction,
	summarizeSalesFinanceTransactions,
} from "./projection";
import type { SalesFinanceReconciledTransaction } from "./reconciliation";

export const SALES_FINANCE_REPORT_TYPES = [
	"payments",
	"payment-methods",
	"applications",
	"exceptions",
	"customers",
] as const;

export type SalesFinanceReportType =
	(typeof SALES_FINANCE_REPORT_TYPES)[number];

export type SalesFinanceReportColumn = {
	key: string;
	label: string;
	type: "text" | "integer" | "money" | "date-time";
	width: number;
};

export type SalesFinanceReportCell = string | number | null;
export type SalesFinanceReportRow = Record<string, SalesFinanceReportCell>;

export type SalesFinanceReportSheet = {
	name: string;
	columns: SalesFinanceReportColumn[];
	rows: SalesFinanceReportRow[];
};

export type SalesFinanceReportContext = {
	from: Date;
	to: Date;
	tab: "all" | "review";
	q?: string | null;
	paymentMethods?: string[] | null;
	statuses?: string[] | null;
	exceptionCodes?: string[] | null;
	applicationStatuses?: string[] | null;
};

export type SalesFinanceWorkbookReport = {
	type: string;
	title: string;
	description: string;
	fileSlug: string;
	generatedAt: Date;
	rowCount: number;
	sheets: SalesFinanceReportSheet[];
};

export type SalesFinanceReport = SalesFinanceWorkbookReport & {
	type: SalesFinanceReportType;
};

const reportDefinitions: Record<
	SalesFinanceReportType,
	{ title: string; description: string; fileSlug: string }
> = {
	payments: {
		title: "Payments Ledger",
		description:
			"Detailed receipts, refunds, applications, references, and ownership.",
		fileSlug: "payments-ledger",
	},
	"payment-methods": {
		title: "Collections by Payment Method",
		description:
			"Payment-method volume, gross receipts, fees, refunds, and net collections.",
		fileSlug: "collections-by-method",
	},
	applications: {
		title: "Payment Applications",
		description:
			"Principal applied to invoices, unapplied balances, and overapplications.",
		fileSlug: "payment-applications",
	},
	exceptions: {
		title: "Finance Review Exceptions",
		description:
			"Payments requiring attention, with the reason and supporting evidence.",
		fileSlug: "review-exceptions",
	},
	customers: {
		title: "Collections by Customer",
		description:
			"Customer-level collections, refunds, applications, and review exposure.",
		fileSlug: "collections-by-customer",
	},
};

const summaryColumns: SalesFinanceReportColumn[] = [
	{ key: "paymentCount", label: "Payments", type: "integer", width: 12 },
	{ key: "received", label: "Received", type: "money", width: 16 },
	{ key: "fees", label: "Fees", type: "money", width: 14 },
	{ key: "refunds", label: "Refunds", type: "money", width: 14 },
	{ key: "net", label: "Net", type: "money", width: 16 },
	{ key: "applied", label: "Applied", type: "money", width: 16 },
	{ key: "unapplied", label: "Unapplied", type: "money", width: 16 },
	{ key: "overapplied", label: "Overapplied", type: "money", width: 16 },
	{ key: "reviewCount", label: "Needs Review", type: "integer", width: 14 },
];

const paymentColumns: SalesFinanceReportColumn[] = [
	{ key: "paymentNo", label: "Payment #", type: "text", width: 12 },
	{ key: "receivedAt", label: "Received At", type: "date-time", width: 21 },
	{ key: "customer", label: "Customer", type: "text", width: 28 },
	{ key: "accountNo", label: "Account", type: "text", width: 18 },
	{ key: "invoices", label: "Invoices", type: "text", width: 24 },
	{ key: "method", label: "Method", type: "text", width: 14 },
	{ key: "reference", label: "Reference", type: "text", width: 24 },
	{ key: "status", label: "Status", type: "text", width: 16 },
	{ key: "received", label: "Received", type: "money", width: 16 },
	{ key: "principal", label: "Principal", type: "money", width: 16 },
	{ key: "fees", label: "Fees", type: "money", width: 14 },
	{ key: "refunds", label: "Refunds", type: "money", width: 14 },
	{ key: "subTotal", label: "Sub Total", type: "money", width: 16 },
	{ key: "net", label: "Net", type: "money", width: 16 },
	{ key: "applied", label: "Applied", type: "money", width: 16 },
	{ key: "unapplied", label: "Unapplied", type: "money", width: 16 },
	{ key: "overapplied", label: "Overapplied", type: "money", width: 16 },
	{ key: "application", label: "Application", type: "text", width: 18 },
	{
		key: "reconciliation",
		label: "Reconciliation",
		type: "text",
		width: 18,
	},
	{
		key: "resolution",
		label: "Resolution",
		type: "text",
		width: 20,
	},
	{ key: "reviewReasons", label: "Review Reasons", type: "text", width: 34 },
	{ key: "salesReps", label: "Sales Reps", type: "text", width: 24 },
	{ key: "recordedBy", label: "Recorded By", type: "text", width: 22 },
	{ key: "description", label: "Description", type: "text", width: 32 },
];

function label(value: string) {
	return value
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function join(values?: string[] | null) {
	return values?.length ? values.map(label).join(", ") : "All";
}

function transactionRows(
	transactions: SalesFinanceTransaction[],
): SalesFinanceReportRow[] {
	return transactions.map((transaction) => {
		const reconciliation =
			transaction as Partial<SalesFinanceReconciledTransaction>;

		return {
			paymentNo: transaction.paymentNo,
			receivedAt: transaction.receivedAt?.toISOString() || "",
			customer: transaction.customerName || "Unnamed customer",
			accountNo: transaction.accountNo || "",
			invoices: transaction.orderNos.join(", "),
			method: label(transaction.paymentMethod),
			reference: transaction.reference || "",
			status: transaction.status,
			received: transaction.receivedAmount,
			principal: transaction.principalAmount,
			fees: transaction.feeAmount,
			refunds: transaction.refundedAmount,
			subTotal: transaction.subTotal ?? 0,
			net: transaction.netAmount,
			applied: transaction.appliedAmount,
			unapplied: transaction.unappliedAmount,
			overapplied: transaction.overappliedAmount,
			application: label(transaction.applicationStatus),
			reconciliation: label(
				reconciliation.reconciliationStatus ||
					(transaction.needsReview ? "unreviewed" : "clean"),
			),
			resolution: reconciliation.reconciliationResolution
				? label(reconciliation.reconciliationResolution)
				: "",
			reviewReasons: transaction.exceptionCodes.map(label).join(", "),
			salesReps: transaction.salesRepNames.join(", "),
			recordedBy: transaction.recordedBy,
			description: transaction.description || "",
		};
	});
}

function selectReportRow(
	row: SalesFinanceReportRow,
	keys: string[],
): SalesFinanceReportRow {
	return Object.fromEntries(keys.map((key) => [key, row[key] ?? null]));
}

function summarySheet(
	transactions: SalesFinanceTransaction[],
): SalesFinanceReportSheet {
	const summary = summarizeSalesFinanceTransactions(transactions);

	return {
		name: "Summary",
		columns: summaryColumns,
		rows: [
			{
				paymentCount: summary.transactionCount,
				received: summary.receivedAmount,
				fees: summary.feeAmount,
				refunds: summary.refundedAmount,
				net: summary.netAmount,
				applied: transactions.reduce(
					(total, transaction) => addMoney(total, transaction.appliedAmount),
					0,
				),
				unapplied: summary.unappliedAmount,
				overapplied: transactions.reduce(
					(total, transaction) =>
						addMoney(total, transaction.overappliedAmount),
					0,
				),
				reviewCount: summary.reviewCount,
			},
		],
	};
}

function contextSheet(
	context: SalesFinanceReportContext,
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
			{ field: "Period Start", value: context.from.toISOString() },
			{ field: "Period End", value: context.to.toISOString() },
			{
				field: "View",
				value: context.tab === "review" ? "Review queue" : "All",
			},
			{ field: "Search", value: context.q || "None" },
			{
				field: "Payment Methods",
				value: join(context.paymentMethods),
			},
			{ field: "Payment Statuses", value: join(context.statuses) },
			{
				field: "Application Statuses",
				value: join(context.applicationStatuses),
			},
			{
				field: "Review Reasons",
				value: join(context.exceptionCodes),
			},
		],
	};
}

function paymentMethodSheet(
	transactions: SalesFinanceTransaction[],
): SalesFinanceReportSheet {
	const groups = new Map<
		string,
		{
			method: string;
			count: number;
			received: number;
			fees: number;
			refunds: number;
			net: number;
			applied: number;
			unapplied: number;
			reviewCount: number;
		}
	>();

	for (const transaction of transactions) {
		const current = groups.get(transaction.paymentMethod) || {
			method: label(transaction.paymentMethod),
			count: 0,
			received: 0,
			fees: 0,
			refunds: 0,
			net: 0,
			applied: 0,
			unapplied: 0,
			reviewCount: 0,
		};
		current.count += 1;
		current.received = addMoney(current.received, transaction.receivedAmount);
		current.fees = addMoney(current.fees, transaction.feeAmount);
		current.refunds = addMoney(current.refunds, transaction.refundedAmount);
		current.net = addMoney(current.net, transaction.netAmount);
		current.applied = addMoney(current.applied, transaction.appliedAmount);
		current.unapplied = addMoney(
			current.unapplied,
			transaction.unappliedAmount,
		);
		current.reviewCount += transaction.needsReview ? 1 : 0;
		groups.set(transaction.paymentMethod, current);
	}

	return {
		name: "By Payment Method",
		columns: [
			{ key: "method", label: "Payment Method", type: "text", width: 20 },
			{ key: "count", label: "Payments", type: "integer", width: 12 },
			{ key: "received", label: "Received", type: "money", width: 16 },
			{ key: "fees", label: "Fees", type: "money", width: 14 },
			{ key: "refunds", label: "Refunds", type: "money", width: 14 },
			{ key: "net", label: "Net", type: "money", width: 16 },
			{ key: "applied", label: "Applied", type: "money", width: 16 },
			{ key: "unapplied", label: "Unapplied", type: "money", width: 16 },
			{
				key: "reviewCount",
				label: "Needs Review",
				type: "integer",
				width: 14,
			},
		],
		rows: Array.from(groups.values()).sort((a, b) => b.net - a.net),
	};
}

function applicationSheet(
	transactions: SalesFinanceTransaction[],
): SalesFinanceReportSheet {
	return {
		name: "Applications",
		columns: [
			{ key: "paymentNo", label: "Payment #", type: "text", width: 12 },
			{ key: "receivedAt", label: "Received At", type: "date-time", width: 21 },
			{ key: "customer", label: "Customer", type: "text", width: 28 },
			{ key: "invoices", label: "Invoices", type: "text", width: 26 },
			{ key: "principal", label: "Principal", type: "money", width: 16 },
			{ key: "applied", label: "Applied", type: "money", width: 16 },
			{ key: "unapplied", label: "Unapplied", type: "money", width: 16 },
			{ key: "overapplied", label: "Overapplied", type: "money", width: 16 },
			{ key: "application", label: "Status", type: "text", width: 18 },
			{
				key: "reviewReasons",
				label: "Review Reasons",
				type: "text",
				width: 34,
			},
		],
		rows: transactionRows(transactions).map((row) =>
			selectReportRow(row, [
				"paymentNo",
				"receivedAt",
				"customer",
				"invoices",
				"principal",
				"applied",
				"unapplied",
				"overapplied",
				"application",
				"reviewReasons",
			]),
		),
	};
}

function exceptionSheet(
	transactions: SalesFinanceTransaction[],
): SalesFinanceReportSheet {
	return {
		name: "Review Exceptions",
		columns: [
			{ key: "paymentNo", label: "Payment #", type: "text", width: 12 },
			{ key: "receivedAt", label: "Received At", type: "date-time", width: 21 },
			{ key: "customer", label: "Customer", type: "text", width: 28 },
			{ key: "invoices", label: "Invoices", type: "text", width: 26 },
			{ key: "method", label: "Method", type: "text", width: 14 },
			{ key: "status", label: "Payment Status", type: "text", width: 18 },
			{ key: "received", label: "Received", type: "money", width: 16 },
			{ key: "unapplied", label: "Unapplied", type: "money", width: 16 },
			{ key: "reference", label: "Reference", type: "text", width: 24 },
			{
				key: "reconciliation",
				label: "Reconciliation",
				type: "text",
				width: 18,
			},
			{
				key: "resolution",
				label: "Resolution",
				type: "text",
				width: 20,
			},
			{
				key: "reviewReasons",
				label: "Review Reasons",
				type: "text",
				width: 38,
			},
			{ key: "recordedBy", label: "Recorded By", type: "text", width: 22 },
		],
		rows: transactionRows(
			transactions.filter((transaction) => transaction.needsReview),
		).map((row) =>
			selectReportRow(row, [
				"paymentNo",
				"receivedAt",
				"customer",
				"invoices",
				"method",
				"status",
				"received",
				"unapplied",
				"reference",
				"reconciliation",
				"resolution",
				"reviewReasons",
				"recordedBy",
			]),
		),
	};
}

function customerSheet(
	transactions: SalesFinanceTransaction[],
): SalesFinanceReportSheet {
	const groups = new Map<
		string,
		{
			customer: string;
			accountNo: string;
			count: number;
			received: number;
			refunds: number;
			net: number;
			applied: number;
			unapplied: number;
			reviewCount: number;
		}
	>();

	for (const transaction of transactions) {
		const customer = transaction.customerName || "Unnamed customer";
		const accountNo = transaction.accountNo || "";
		const key = `${customer}\u0000${accountNo}`;
		const current = groups.get(key) || {
			customer,
			accountNo,
			count: 0,
			received: 0,
			refunds: 0,
			net: 0,
			applied: 0,
			unapplied: 0,
			reviewCount: 0,
		};
		current.count += 1;
		current.received = addMoney(current.received, transaction.receivedAmount);
		current.refunds = addMoney(current.refunds, transaction.refundedAmount);
		current.net = addMoney(current.net, transaction.netAmount);
		current.applied = addMoney(current.applied, transaction.appliedAmount);
		current.unapplied = addMoney(
			current.unapplied,
			transaction.unappliedAmount,
		);
		current.reviewCount += transaction.needsReview ? 1 : 0;
		groups.set(key, current);
	}

	return {
		name: "By Customer",
		columns: [
			{ key: "customer", label: "Customer", type: "text", width: 32 },
			{ key: "accountNo", label: "Account", type: "text", width: 18 },
			{ key: "count", label: "Payments", type: "integer", width: 12 },
			{ key: "received", label: "Received", type: "money", width: 16 },
			{ key: "refunds", label: "Refunds", type: "money", width: 14 },
			{ key: "net", label: "Net", type: "money", width: 16 },
			{ key: "applied", label: "Applied", type: "money", width: 16 },
			{ key: "unapplied", label: "Unapplied", type: "money", width: 16 },
			{
				key: "reviewCount",
				label: "Needs Review",
				type: "integer",
				width: 14,
			},
		],
		rows: Array.from(groups.values()).sort((a, b) => b.net - a.net),
	};
}

export function buildSalesFinanceReport(input: {
	type: SalesFinanceReportType;
	transactions: SalesFinanceTransaction[];
	context: SalesFinanceReportContext;
	generatedAt?: Date;
}): SalesFinanceReport {
	const definition = reportDefinitions[input.type];
	const generatedAt = input.generatedAt || new Date();
	const commonSheets = [
		contextSheet(input.context, definition, generatedAt),
		summarySheet(input.transactions),
	];
	let reportSheets: SalesFinanceReportSheet[];

	switch (input.type) {
		case "payment-methods":
			reportSheets = [
				paymentMethodSheet(input.transactions),
				{
					name: "Source Payments",
					columns: paymentColumns,
					rows: transactionRows(input.transactions),
				},
			];
			break;
		case "applications":
			reportSheets = [applicationSheet(input.transactions)];
			break;
		case "exceptions":
			reportSheets = [exceptionSheet(input.transactions)];
			break;
		case "customers":
			reportSheets = [
				customerSheet(input.transactions),
				{
					name: "Source Payments",
					columns: paymentColumns,
					rows: transactionRows(input.transactions),
				},
			];
			break;
		default:
			reportSheets = [
				{
					name: "Payments",
					columns: paymentColumns,
					rows: transactionRows(input.transactions),
				},
			];
	}

	return {
		type: input.type,
		title: definition.title,
		description: definition.description,
		fileSlug: definition.fileSlug,
		generatedAt,
		rowCount:
			input.type === "exceptions"
				? input.transactions.filter((transaction) => transaction.needsReview)
						.length
				: input.transactions.length,
		sheets: [...commonSheets, ...reportSheets],
	};
}
