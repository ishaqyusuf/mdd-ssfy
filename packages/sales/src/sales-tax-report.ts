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

export type SalesTaxReportOrder = {
	orderNo: string;
	customerName: string;
	total: number | null | undefined;
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
	{ key: "salesTotal", label: "Sales Total", type: "money", width: 18 },
	{ key: "taxTotal", label: "Tax Total", type: "money", width: 18 },
];

const detailColumns: SalesWorkbookColumn[] = [
	{ key: "orderNo", label: "Order #", type: "text", width: 18 },
	{ key: "customerName", label: "Customer Name", type: "text", width: 32 },
	{ key: "total", label: "Total", type: "money", width: 18 },
	{ key: "tax", label: "Tax", type: "money", width: 18 },
];

export function buildSalesTaxReport({
	period,
	orders,
	generatedAt = new Date(),
}: {
	period: SalesTaxReportPeriod;
	orders: SalesTaxReportOrder[];
	generatedAt?: Date;
}): SalesTaxWorkbookReport {
	const rows = orders.map((order) => ({
		orderNo: order.orderNo,
		customerName: order.customerName,
		total: roundMoney(order.total),
		tax: roundMoney(order.tax),
	}));
	const salesTotal = addMoney(...rows.map((row) => row.total));
	const taxTotal = addMoney(...rows.map((row) => row.tax));

	return {
		type: "sales-tax",
		title: "Sales Tax Report",
		description:
			"Current persisted fully paid sales order totals and tax for the selected business-date period.",
		fileSlug: `tax-${period.fromDate}-to-${period.toDate}`,
		generatedAt,
		rowCount: rows.length,
		sheets: [
			{
				name: "Report Context",
				columns: contextColumns,
				rows: [
					{ field: "Period start", value: period.fromDate },
					{ field: "Period end", value: period.toDate },
					{ field: "Business timezone", value: period.timezone },
					{ field: "Generated at", value: generatedAt.toISOString() },
				],
			},
			{
				name: "Summary",
				columns: summaryColumns,
				rows: [{ orders: rows.length, salesTotal, taxTotal }],
			},
			{
				name: "Sales Tax",
				columns: detailColumns,
				rows,
			},
		],
	};
}
