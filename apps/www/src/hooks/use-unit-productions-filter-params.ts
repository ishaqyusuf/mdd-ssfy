import { RouterInputs } from "@api/trpc/routers/_app";
import { parseAsInteger, useQueryStates } from "nuqs";
import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server";

type FilterKeys = keyof Exclude<
  RouterInputs["community"]["getUnitProductions"],
  void
>;

export const unitProductionFilterParams = {
  ids: parseAsArrayOf(parseAsInteger),
  q: parseAsString,
  builderSlug: parseAsString,
  projectSlug: parseAsString,
  taskNames: parseAsArrayOf(parseAsString),
  production: parseAsString,
  dateRange: parseAsArrayOf(parseAsString),
} satisfies Partial<Record<FilterKeys, any>>;

export function useUnitProductionFilterParams() {
  const [filters, setFilters] = useQueryStates(unitProductionFilterParams);

  return {
    filters,
    setFilters,
    hasFilters: Object.values(filters).some((value) => value !== null),
  };
}

export const loadUnitProductionFilterParams = createLoader(
  unitProductionFilterParams,
);
