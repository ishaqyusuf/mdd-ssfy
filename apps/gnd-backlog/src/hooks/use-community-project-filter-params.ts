import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<
  RouterInputs["community"]["getCommunityProjects"],
  void
>;

export const communityProjectFilterParams = {
  q: parseAsString,
  builderId: parseAsInteger,
} satisfies Partial<Record<FilterKeys, any>>;

export function useCommunityProjectFilterParams() {
  const [filters, setFilters] = useQueryStates(communityProjectFilterParams);
  return {
    filters,
    setFilters,
    hasFilters: Object.values(filters).some((value) => value !== null),
  };
}
export const loadCommunityProjectFilterParams = createLoader(
  communityProjectFilterParams
);
