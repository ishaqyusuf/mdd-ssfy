import { parseAsString, useQueryStates } from "nuqs";
import { createLoader } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<
    RouterInputs["sales"]["getSalesResolutions"],
    void
>;

export const resolutionCenterFilterParamsSchema = {
    q: parseAsString,
    "order.no": parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useResolutionCenterFilterParams() {
    const [filters, setFilters] = useQueryStates(
        resolutionCenterFilterParamsSchema,
    );
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadResolutionCenterFilterParams = createLoader(
    resolutionCenterFilterParamsSchema,
);

