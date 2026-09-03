import {
	differenceInCalendarDays,
	endOfDay,
	format,
	isMatch,
	isValid,
	parse,
	startOfDay,
	subDays,
} from "date-fns";

export const SALES_REPORTING_DATE_FORMAT = "yyyy-MM-dd";
export const SALES_REPORTING_ALL_TIME_FROM = "2016-01-01" as const;

export type SalesReportingGranularity = "day" | "week" | "month";

export type SalesReportingFilter = {
	from?: string | null;
	to?: string | null;
};

export const SALES_REPORTING_METRICS = {
	bookedSales: {
		label: "Booked sales",
		description:
			"Sum of grand totals for non-deleted sales orders created in the selected period.",
		format: "currency",
	},
	orderCount: {
		label: "Orders",
		description:
			"Count of non-deleted sales orders created in the selected period.",
		format: "number",
	},
	quoteCount: {
		label: "Quotes",
		description: "Count of non-deleted quotes created in the selected period.",
		format: "number",
	},
	averageOrderValue: {
		label: "Average order value",
		description: "Booked sales divided by order count for the selected period.",
		format: "currency",
	},
	activeProductionOrders: {
		label: "Active production",
		description:
			"Non-deleted orders currently marked pending, in progress, or started in production.",
		format: "number",
	},
} as const;

export function parseSalesReportingDate(value?: string | null) {
	if (!value || !isMatch(value, SALES_REPORTING_DATE_FORMAT)) return null;
	const parsed = parse(value, SALES_REPORTING_DATE_FORMAT, new Date());
	return isValid(parsed) ? parsed : null;
}

export function formatSalesReportingDate(date: Date) {
	return format(date, SALES_REPORTING_DATE_FORMAT);
}

export function resolveSalesReportingPeriod(
	filter: SalesReportingFilter,
	now = new Date(),
) {
	const parsedFrom = parseSalesReportingDate(filter.from);
	const parsedTo = parseSalesReportingDate(filter.to);
	const fallbackTo = endOfDay(now);
	const fallbackFrom = startOfDay(subDays(now, 29));
	const from = startOfDay(parsedFrom || fallbackFrom);
	const to = endOfDay(parsedTo || fallbackTo);

	if (from <= to) return { from, to };

	return {
		from: startOfDay(parsedTo || fallbackFrom),
		to: endOfDay(parsedFrom || fallbackTo),
	};
}

export function getPreviousSalesReportingPeriod(
	filter: SalesReportingFilter,
	now = new Date(),
) {
	const current = resolveSalesReportingPeriod(filter, now);
	const days = differenceInCalendarDays(current.to, current.from) + 1;
	const to = endOfDay(subDays(current.from, 1));
	const from = startOfDay(subDays(to, days - 1));

	return { from, to };
}

export function getSalesReportingGranularity(
	filter: SalesReportingFilter,
	now = new Date(),
): SalesReportingGranularity {
	const { from, to } = resolveSalesReportingPeriod(filter, now);
	const days = differenceInCalendarDays(to, from) + 1;

	if (days <= 45) return "day";
	if (days <= 180) return "week";
	return "month";
}

export function calculateReportingChange(
	current: number,
	previous: number,
): number | null {
	if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
	if (previous === 0) return current === 0 ? 0 : null;
	return ((current - previous) / Math.abs(previous)) * 100;
}
