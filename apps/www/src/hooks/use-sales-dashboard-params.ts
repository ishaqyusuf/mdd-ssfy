import {
    addDays,
    addMonths,
    addYears,
    endOfDay,
    endOfMonth,
    formatISO,
    startOfDay,
    startOfMonth,
    startOfYear,
    subDays,
    subMonths,
} from "date-fns";
import { parseAsString, useQueryStates } from "nuqs";

export const chartPeriodOptions = [
    {
        label: "Last 7 days",
        value: "last_7d",
        range: {
            from: startOfDay(subDays(new Date(), 6)),
            to: endOfDay(new Date()),
        },
    },
    {
        label: "Last 30 days",
        value: "last_30d",
        range: {
            from: startOfDay(subDays(new Date(), 29)),
            to: endOfDay(new Date()),
        },
    },
    {
        label: "This month",
        value: "this_month",
        range: {
            from: startOfDay(new Date(new Date().setDate(1))),
            to: endOfDay(new Date()),
        },
    },
    {
        label: "Last month",
        value: "last_month",
        range: {
            from: startOfMonth(subMonths(new Date(), 1)),
            to: endOfMonth(subMonths(new Date(), 1)),
        },
    },
    {
        label: "Last 6 months",
        value: "last_6_months",
        range: {
            from: startOfMonth(addMonths(new Date(), -6)),
            to: startOfDay(new Date(new Date().setDate(1))),
        },
    },
    {
        label: "Last 12 months",
        value: "last_12_months",
        range: {
            from: startOfMonth(addMonths(new Date(), -12)),
            to: startOfDay(new Date(new Date().setDate(1))),
        },
    },
    {
        label: "All Time",
        value: "all_time",
        range: {
            from: startOfYear(addYears(new Date(new Date().setDate(1)), -10)),
            to: endOfDay(new Date()),
        },
    },
];

export const defaultSalesDashboardPeriod = chartPeriodOptions[1];
export const defaultSalesDashboardParams = {
    from: formatISO(defaultSalesDashboardPeriod.range.from, {
        representation: "date",
    }),
    to: formatISO(defaultSalesDashboardPeriod.range.to, {
        representation: "date",
    }),
    period: defaultSalesDashboardPeriod.value,
    chart: "revenue",
} as const;

export type SalesDashboardParamsState = {
    from: string;
    to: string;
    period: string;
    chart: string;
};

export function resolveSalesDashboardParams(
    raw?: Record<string, string | string[] | undefined> | null,
): SalesDashboardParamsState {
    const from = raw?.from;
    const to = raw?.to;
    const period = raw?.period;
    const chart = raw?.chart;

    return {
        from:
            (typeof from === "string" && from) || defaultSalesDashboardParams.from,
        to: (typeof to === "string" && to) || defaultSalesDashboardParams.to,
        period:
            (typeof period === "string" && period) ||
            defaultSalesDashboardParams.period,
        chart:
            (typeof chart === "string" && chart) ||
            defaultSalesDashboardParams.chart,
    };
}

export const useSalesDashboardParams = () => {
    const [params, setParams] = useQueryStates({
        from: parseAsString.withDefault(
            defaultSalesDashboardParams.from,
        ),
        to: parseAsString.withDefault(defaultSalesDashboardParams.to),
        period: parseAsString.withDefault(defaultSalesDashboardParams.period),
        chart: parseAsString.withDefault(defaultSalesDashboardParams.chart),
    });

    return { params, setParams };
};
