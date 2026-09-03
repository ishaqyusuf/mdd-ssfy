import { SALES_REPORTING_ALL_TIME_FROM } from "@gnd/sales/reporting";
import {
    addMonths,
    endOfDay,
    endOfMonth,
    format,
    isValid,
    parse,
    startOfDay,
    startOfMonth,
    subDays,
    subMonths,
} from "date-fns";
import {
    parseAsArrayOf,
    parseAsInteger,
    parseAsString,
    useQueryStates,
} from "nuqs";

const salesDashboardDateParamFormat = "yyyy-MM-dd";

export function formatSalesDashboardDateParam(date: Date) {
    return format(date, salesDashboardDateParamFormat);
}

export function parseSalesDashboardDateParam(value?: string | null) {
    if (!value) return undefined;

    const parsed = parse(value, salesDashboardDateParamFormat, new Date());
    return isValid(parsed) ? parsed : undefined;
}

export function getSalesDashboardPeriodOptions(now = new Date()) {
    return [
        {
            label: "Last 7 days",
            value: "last_7d",
            range: {
                from: startOfDay(subDays(now, 6)),
                to: endOfDay(now),
            },
        },
        {
            label: "Last 30 days",
            value: "last_30d",
            range: {
                from: startOfDay(subDays(now, 29)),
                to: endOfDay(now),
            },
        },
        {
            label: "This month",
            value: "this_month",
            range: {
                from: startOfMonth(now),
                to: endOfDay(now),
            },
        },
        {
            label: "Last month",
            value: "last_month",
            range: {
                from: startOfMonth(subMonths(now, 1)),
                to: endOfMonth(subMonths(now, 1)),
            },
        },
        {
            label: "Last 6 months",
            value: "last_6_months",
            range: {
                from: startOfMonth(addMonths(now, -6)),
                to: startOfMonth(now),
            },
        },
        {
            label: "Last 12 months",
            value: "last_12_months",
            range: {
                from: startOfMonth(addMonths(now, -12)),
                to: startOfMonth(now),
            },
        },
        {
            label: "All time",
            value: "all_time",
            range: {
                from: startOfDay(
                    parse(
                        SALES_REPORTING_ALL_TIME_FROM,
                        salesDashboardDateParamFormat,
                        now,
                    ),
                ),
                to: endOfDay(now),
            },
        },
    ];
}

function getDefaultSalesDashboardParams(now = new Date()) {
    const defaultSalesDashboardPeriod = getSalesDashboardPeriodOptions(now)[1];

    return {
        from: formatSalesDashboardDateParam(
            defaultSalesDashboardPeriod.range.from,
        ),
        to: formatSalesDashboardDateParam(defaultSalesDashboardPeriod.range.to),
        period: defaultSalesDashboardPeriod.value,
        chart: "revenue",
    } as const;
}

export type SalesDashboardParamsState = {
    from: string;
    to: string;
    period: string;
    chart: string;
    salesRepIds: number[];
    salesChannels: string[];
};

function resolveArrayParam(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value;
    return value?.split(",").filter(Boolean) ?? [];
}

export function resolveSalesDashboardParams(
    raw?: Record<string, string | string[] | undefined> | null,
): SalesDashboardParamsState {
    const from = raw?.from;
    const to = raw?.to;
    const period = raw?.period;
    const chart = raw?.chart;
    const salesRepIds = resolveArrayParam(raw?.salesRepIds)
        .map(Number)
        .filter((value) => Number.isInteger(value) && value > 0);
    const salesChannels = resolveArrayParam(raw?.salesChannels);
    const defaults = getDefaultSalesDashboardParams();

    return {
        from: (typeof from === "string" && from) || defaults.from,
        to: (typeof to === "string" && to) || defaults.to,
        period: (typeof period === "string" && period) || defaults.period,
        chart: (typeof chart === "string" && chart) || defaults.chart,
        salesRepIds,
        salesChannels,
    };
}

export const useSalesDashboardParams = () => {
    const defaults = getDefaultSalesDashboardParams();
    const [params, setParams] = useQueryStates({
        from: parseAsString.withDefault(defaults.from),
        to: parseAsString.withDefault(defaults.to),
        period: parseAsString.withDefault(defaults.period),
        chart: parseAsString.withDefault(defaults.chart),
        salesRepIds: parseAsArrayOf(parseAsInteger).withDefault([]),
        salesChannels: parseAsArrayOf(parseAsString).withDefault([]),
    });

    return { params, setParams };
};
