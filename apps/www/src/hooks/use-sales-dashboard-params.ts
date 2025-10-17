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

export const useSalesDashboardParams = () => {
    const [params, setParams] = useQueryStates({
        from: parseAsString.withDefault(
            formatISO(chartPeriodOptions[1].range.from, {
                representation: "date",
            }),
        ),
        to: parseAsString.withDefault(
            formatISO(chartPeriodOptions[1].range.to, {
                representation: "date",
            }),
        ),
        period: parseAsString.withDefault("last_30d"),
        chart: parseAsString.withDefault("revenue"),
    });

    return { params, setParams };
};

