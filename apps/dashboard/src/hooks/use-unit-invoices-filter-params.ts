import { RouterInputs } from "@api/trpc/routers/_app";
import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server";
import { useQueryStates } from "nuqs";

type FilterKeys = keyof Exclude<RouterInputs["community"]["getUnitInvoices"], void>;

export const unitInvoiceFilterParams = {
  q: parseAsString,
  builderSlug: parseAsString,
  projectSlug: parseAsString,
  dateRange: parseAsArrayOf(parseAsString),
  installation: parseAsString,
  production: parseAsString,
  invoice: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useUnitInvoiceFilterParams() {
  const [filters, setFilters] = useQueryStates(unitInvoiceFilterParams);

  return {
    filters,
    setFilters,
    hasFilters: Object.values(filters).some((value) => value !== null),
  };
}

export const loadUnitInvoiceFilterParams = createLoader(unitInvoiceFilterParams);
