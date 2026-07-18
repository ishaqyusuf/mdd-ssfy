import type { RouterInputs } from "@api/trpc/routers/_app";
import { parseAsString, useQueryStates } from "nuqs";
import { createLoader } from "nuqs/server";
type FilterKeys = keyof Exclude<RouterInputs["siteActions"]["index"], void>;

const siteActionFilterParamsSchema = {
    status: parseAsString,
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, unknown>>;

export function useSiteActionFilterParams() {
    const [filter, setFilter] = useQueryStates(siteActionFilterParamsSchema);
    return {
        filter,
        setFilter,
        hasFilters: Object.values(filter).some((value) => value !== null),
    };
}
export const loadingSiteActionFilterParams = createLoader(
    siteActionFilterParamsSchema,
);
