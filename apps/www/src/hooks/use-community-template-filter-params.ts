import { useQueryStates } from "nuqs";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
// type FilterKeys = keyof Exclude<RouterInputs["community"]["index"], void>;

export const communityTemplateFilterParams = {
    q: parseAsString,
    projectId: parseAsInteger,
    builderId: parseAsInteger,
};
// } satisfies Partial<Record<FilterKeys, any>>;

export function useCommunityTemplateFilterParams() {
    const [filters, setFilters] = useQueryStates(communityTemplateFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadCommunityTemplateFilterParams = createLoader(
    communityTemplateFilterParams,
);

