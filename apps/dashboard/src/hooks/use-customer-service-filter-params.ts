import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<
    RouterInputs["customerService"]["getCustomerServices"],
    void
>;

export const customerServiceFilterParams = {
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useCustomerServiceFilterParams() {
    const [filters, setFilters] = useQueryStates(customerServiceFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadCustomerServiceFilterParams = createLoader(
    customerServiceFilterParams
);

