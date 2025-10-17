import { useQueryStates } from "nuqs";
import { parseAsArrayOf, createLoader, parseAsString } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<
    RouterInputs["sales"]["getProductReport"],
    void
>;

export const productReportFilterParams = {
    q: parseAsString,
    reportCategory: parseAsString,
    dateRange: parseAsArrayOf(parseAsString),
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

