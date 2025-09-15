import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["backlogs"]["getBacklogs"], void>;

export const backlogsFilterParams = {
  q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useBacklogsFilters() {
  const [filters, setFilters] = useQueryStates(backlogsFilterParams);
  return {
    filters,
    setFilters,
    hasFilters: Object.values(filters).some((value) => value !== null),
  };
}
export const loadBacklogsFilterParams = createLoader(backlogsFilterParams);
