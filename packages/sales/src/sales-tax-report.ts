import { addMoney, roundMoney } from "./payment-system/domain/money";
import type {
	SalesWorkbookColumn,
	SalesWorkbookReport,
} from "./sales-workbook";

export const SALES_TAX_REPORT_TIME_ZONE = "America/New_York";

type CalendarDate = {
	year: number;
	month: number;
	day: number;
};

export type SalesTaxReportPeriod = {
	from: Date;
	toExclusive: Date;
	fromDate: string;
	toDate: string;
	timezone: string;
};

export type SalesTaxReportEntry = {
	salesOrderId: number;
	orderNo: string;
	customerName: string;
	recognizedAt: string;
	entryType: "SALE" | "ADJUSTMENT" | "REVERSAL";
	recognitionSource: "DELIVERY" | "PICKUP" | "ORDER_STATUS" | "MANUAL_BACKFILL";
	taxCode: string | null;
	total: number | null | undefined;
	grossSales: number | null | undefined;
	exemptSales: number | null | undefined;
	taxableAmount: number | null | undefined;
	stateTax: number | null | undefined;
	surtax: number | null | undefined;
	tax: number | null | undefined;
};

export type SalesTaxWorkbookReport = SalesWorkbookReport<"sales-tax">;

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function formatDateOnly(date: CalendarDate) {
	return [
		date.year,
		String(date.month).padStart(2, "0"),
		String(date.day).padStart(2, "0"),
	].join("-");
}

function parseDateOnly(value: string): CalendarDate {
	const match = DATE_ONLY_PATTERN.exec(value);
	if (!match) {
		throw new Error("Sales tax report date must use YYYY-MM-DD.");
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const normalized = new Date(Date.UTC(year, month - 1, day));
	if (
		normalized.getUTCFullYear() !== year ||
		normalized.getUTCMonth() !== month - 1 ||
		normalized.getUTCDate() !== day
	) {
		throw new Error("Sales tax report date must be a valid calendar date.");
	}
	return { year, month, day };
}

function datePartsInTimezone(value: Date, timezone: string) {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat("en-US", {
			day: "2-digit",
			hour: "2-digit",
			hourCycle: "h23",
			minute: "2-digit",
			month: "2-digit",
			second: "2-digit",
			timeZone: timezone,
			year: "numeric",
		})
			.formatToParts(value)
			.filter((part) => part.type !== "literal")
			.map((part) => [part.type, Number(part.value)]),
	) as Record<string, number | undefined>;
	const required = (key: string) => {
		const part = parts[key];
		if (part == null || Number.isNaN(part)) {
			throw new Error(`Unable to resolve sales tax report ${key}.`);
		}
		return part;
	};
	return {
		year: required("year"),
		month: required("month"),
		day: required("day"),
		hour: required("hour"),
		minute: required("minute"),
		second: required("second"),
	};
}

function timezoneOffsetMs(value: Date, timezone: string) {
	const parts = datePartsInTimezone(value, timezone);
	return (
		Date.UTC(
			parts.year,
			parts.month - 1,
			parts.day,
			parts.hour,
			parts.minute,
			parts.second,
		) - value.getTime()
	);
}

function zonedStartOfDay(date: CalendarDate, timezone: string) {
	const nominalUtc = Date.UTC(date.year, date.month - 1, date.day);
	const firstOffset = timezoneOffsetMs(new Date(nominalUtc), timezone);
	let resolved = new Date(nominalUtc - firstOffset);
	const resolvedOffset = timezoneOffsetMs(resolved, timezone);
	if (resolvedOffset !== firstOffset) {
		resolved = new Date(nominalUtc - resolvedOffset);
	}
	return resolved;
}

function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
	const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
	return {
		year: value.getUTCFullYear(),
		month: value.getUTCMonth() + 1,
		day: value.getUTCDate(),
	};
}

export function getSalesTaxBusinessDate(
	now = new Date(),
	timezone = SALES_TAX_REPORT_TIME_ZONE,
) {
	const parts = datePartsInTimezone(now, timezone);
	return formatDateOnly(parts);
}

export function resolveSalesTaxReportPeriod({
	from,
	to,
	now = new Date(),
	timezone = SALES_TAX_REPORT_TIME_ZONE,
}: {
	from: string;
	to: string;
	now?: Date;
	timezone?: string;
}): SalesTaxReportPeriod {
	const start = parseDateOnly(from);
	const end = parseDateOnly(to);
	if (from > to) {
		throw new Error(
			"Sales tax report start date must be on or before the end date.",
		);
	}
	if (to > getSalesTaxBusinessDate(now, timezone)) {
		throw new Error("Sales tax report end date cannot be in the future.");
	}
	return {
		from: zonedStartOfDay(start, timezone),
		toExclusive: zonedStartOfDay(addCalendarDays(end, 1), timezone),
		fromDate: formatDateOnly(start),
		toDate: formatDateOnly(end),
		timezone,
	};
}

const contextColumns: SalesWorkbookColumn[] = [
	{ key: "field", label: "Report Context", type: "text", width: 24 },
	{ key: "value", label: "Value", type: "text", width: 38 },
];

const summaryColumns: SalesWorkbookColumn[] = [
	{ key: "orders", label: "Orders", type: "integer", width: 12 },
	{ key: "invoiceTotal", label: "Invoice Total", type: "money", width: 18 },
	{ key: "grossSales", label: "Gross Sales", type: "money", width: 18 },
	{ key: "exemptSales", label: "Exempt Sales", type: "money", width: 18 },
	{ key: "taxableAmount", label: "Taxable Amount", type: "money", width: 18 },
	{ key: "stateTax", label: "State Tax", type: "money", width: 18 },
	{ key: "surtax", label: "Surtax", type: "money", width: 18 },
	{ key: "taxTotal", label: "Tax Total", type: "money", width: 18 },
];

const detailColumns: SalesWorkbookColumn[] = [
	{ key: "orderNo", label: "Order #", type: "text", width: 18 },
	{ key: "customerName", label: "Customer Name", type: "text", width: 32 },
	{ key: "total", label: "Total", type: "money", width: 18 },
	{ key: "tax", label: "Tax", type: "money", width: 18 },
];

const auditColumns: SalesWorkbookColumn[] = [
	{
		key: "recognizedAt",
		label: "Taxable Sale Date",
		type: "date-time",
		width: 22,
	},
	{ key: "orderNo", label: "Order #", type: "text", width: 18 },
	{ key: "entryType", label: "Entry Type", type: "text", width: 16 },
	{
		key: "recognitionSource",
		label: "Recognition Source",
		type: "text",
		width: 22,
	},
	{ key: "grossSales", label: "Gross Sales", type: "money", width: 18 },
	{ key: "exemptSales", label: "Exempt Sales", type: "money", width: 18 },
	{ key: "taxableAmount", label: "Taxable Amount", type: "money", width: 18 },
	{ key: "stateTax", label: "State Tax", type: "money", width: 18 },
	{ key: "surtax", label: "Surtax", type: "money", width: 18 },
	{ key: "tax", label: "Tax Due", type: "money", width: 18 },
	{ key: "taxCode", label: "Tax Code", type: "text", width: 14 },
];

export function buildSalesTaxReport({
	period,
	entries,
	generatedAt = new Date(),
}: {
	period: SalesTaxReportPeriod;
	entries: SalesTaxReportEntry[];
	generatedAt?: Date;
}): SalesTaxWorkbookReport {
	const normalizedEntries = entries.map((entry) => ({
		...entry,
		total: roundMoney(entry.total),
		grossSales: roundMoney(entry.grossSales),
		exemptSales: roundMoney(entry.exemptSales),
		taxableAmount: roundMoney(entry.taxableAmount),
		stateTax: roundMoney(entry.stateTax),
		surtax: roundMoney(entry.surtax),
		tax: roundMoney(entry.tax),
	}));
	const rows = normalizedEntries.map((entry) => ({
		orderNo: entry.orderNo,
		customerName: entry.customerName,
		total: entry.total,
		tax: entry.tax,
	}));
	const uniqueOrderCount = new Set(
		normalizedEntries.map((entry) => entry.salesOrderId),
	).size;
	const invoiceTotal = addMoney(
		...normalizedEntries.map((entry) => entry.total),
	);
	const grossSales = addMoney(
		...normalizedEntries.map((entry) => entry.grossSales),
	);
	const exemptSales = addMoney(
		...normalizedEntries.map((entry) => entry.exemptSales),
	);
	const taxableAmount = addMoney(
		...normalizedEntries.map((entry) => entry.taxableAmount),
	);
	const stateTax = addMoney(
		...normalizedEntries.map((entry) => entry.stateTax),
	);
	const surtax = addMoney(...normalizedEntries.map((entry) => entry.surtax));
	const taxTotal = addMoney(...normalizedEntries.map((entry) => entry.tax));

	return {
		type: "sales-tax",
		title: "Sales Tax Report",
		description:
			"Taxable sales recognized in the selected business-date period, independent of customer payment timing.",
		fileSlug: `tax-${period.fromDate}-to-${period.toDate}`,
		generatedAt,
		rowCount: normalizedEntries.length,
		sheets: [
			{
				name: "Report Context",
				columns: contextColumns,
				rows: [
					{ field: "Period start", value: period.fromDate },
					{ field: "Period end", value: period.toDate },
					{ field: "Date basis", value: "Taxable sale recognition date" },
					{ field: "Payment treatment", value: "Payment-independent accrual" },
					{ field: "Recognition policy", value: "Florida fulfilled sale v1" },
					{ field: "Business timezone", value: period.timezone },
					{ field: "Generated at", value: generatedAt.toISOString() },
				],
			},
			{
				name: "Florida Summary",
				columns: summaryColumns,
				rows: [
					{
						orders: uniqueOrderCount,
						invoiceTotal,
						grossSales,
						exemptSales,
						taxableAmount,
						stateTax,
						surtax,
						taxTotal,
					},
				],
			},
			{
				name: "Sales Tax",
				columns: detailColumns,
				rows,
			},
			{
				name: "Recognition Audit",
				columns: auditColumns,
				rows: normalizedEntries.map((entry) => ({
					recognizedAt: entry.recognizedAt,
					orderNo: entry.orderNo,
					entryType: entry.entryType,
					recognitionSource: entry.recognitionSource,
					grossSales: entry.grossSales,
					exemptSales: entry.exemptSales,
					taxableAmount: entry.taxableAmount,
					stateTax: entry.stateTax,
					surtax: entry.surtax,
					tax: entry.tax,
					taxCode: entry.taxCode,
				})),
			},
		],
	};
}
