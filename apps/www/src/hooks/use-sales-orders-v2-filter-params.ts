import type { RouterInputs } from "@api/trpc/routers/_app";
import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server";
import { useQueryStates } from "nuqs";

type FilterKeys = keyof Exclude<RouterInputs["sales"]["getOrdersV2"], void>;

export const salesOrdersV2FilterParams = {
  q: parseAsString,
  dateRange: parseAsArrayOf(parseAsString),
  customerName: parseAsString,
  phone: parseAsString,
  po: parseAsString,
  orderNo: parseAsString,
  invoiceStatus: parseAsString,
  production: parseAsString,
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
