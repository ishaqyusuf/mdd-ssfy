import type { RouterInputs } from "@api/trpc/routers/_app";
import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import { useQueryStates } from "nuqs";
import { SALES_PRIORITY_VALUES } from "@sales/priority";

type FilterKeys = keyof Exclude<RouterInputs["sales"]["getOrdersV2"], void>;

export const salesOrdersV2FilterParams = {
  q: parseAsString,
  dateRange: parseAsArrayOf(parseAsString),
  customerName: parseAsString,
  phone: parseAsString,
  po: parseAsString,
  orderNo: parseAsString,
  invoiceStatus: parseAsStringLiteral(["paid", "outstanding"] as const),
  production: parseAsStringLiteral([
    "pending",
    "in progress",
    "completed",
  ] as const),
  priority: parseAsStringLiteral(SALES_PRIORITY_VALUES),
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useSalesOrdersV2FilterParams() {
  const [filters, setFilters] = useQueryStates(salesOrdersV2FilterParams);

  return {
    filters,
    setFilters,
    hasFilters: Object.values(filters).some((value) => value !== null),
  };
}

export const loadSalesOrdersV2FilterParams = createLoader(
  salesOrdersV2FilterParams,
);
