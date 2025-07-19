
import {
  addDays,
  endOfDay,
  formatISO,
  startOfDay,
  subDays,
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
      from: startOfDay(addDays(new Date(new Date().setDate(1)), -1)),
      to: startOfDay(new Date(new Date().setDate(1))),
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
