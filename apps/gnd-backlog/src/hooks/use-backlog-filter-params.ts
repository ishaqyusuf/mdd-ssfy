import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["backlogs"]["getBacklogs"], void>;

export const backlogFilterParams = {
  q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useBacklogFilterParams() {
  const [filters, setFilters] = useQueryStates(backlogFilterParams);
  return {
    filters,
    setFilters,
    hasFilters: Object.values(filters).some((value) => value !== null),
  };
}
export const loadBacklogFilterParams = createLoader(backlogFilterParams);
