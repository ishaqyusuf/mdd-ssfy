import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["sales"]["salesStatistics"], void>;

export const productReportFilterParams = {
    q: parseAsString,
    categoryId: parseAsInteger,
} satisfies Partial<Record<FilterKeys, any>>;

export function useProductReportFilters() {
    const [filters, setFilters] = useQueryStates(productReportFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadProductReportFilterParams = createLoader(
    productReportFilterParams,
);

