import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsArrayOf } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<
    RouterInputs["community"]["getProjectUnits"],
    void
>;

export const projectUnitFilterParams = {
    q: parseAsString,
    builderSlug: parseAsString,
    projectSlug: parseAsString,
    dateRange: parseAsArrayOf(parseAsString),
    installation: parseAsString,
    production: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useProjectUnitFilterParams() {
    const [filters, setFilters] = useQueryStates(projectUnitFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadProjectUnitFilterParams = createLoader(
    projectUnitFilterParams,
);

