import { useQueryStates } from "nuqs";
import {
    createLoader,
    parseAsString,
    parseAsInteger,
    parseAsArrayOf,
    parseAsBoolean,
} from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<
    RouterInputs["sales"]["getSalesAccountings"],
    void
>;

export const salesAccountingFilterParams = {
    q: parseAsString,
    orderNo: parseAsString,
    accountNo: parseAsString,
    status: parseAsString,
    paymentType: parseAsString,
    salesRepId: parseAsInteger,
    payments: parseAsString,
    dateRange: parseAsArrayOf(parseAsString),
    d: parseAsBoolean,
} satisfies Partial<Record<FilterKeys, any>>;

export function useSalesAccountingFilterParams() {
    const [filters, setFilters] = useQueryStates(salesAccountingFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadSalesAccountingFilterParams = createLoader(
    salesAccountingFilterParams,
);

