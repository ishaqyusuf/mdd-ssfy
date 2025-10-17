import { parseAsBoolean, useQueryStates } from "nuqs";
import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
import { useAuth } from "./use-auth";
type FilterKeys = keyof Exclude<RouterInputs["sales"]["index"], void>;

export const salesFilterParamsSchema = {
    q: parseAsString,
    "customer.name": parseAsString,
    phone: parseAsString,
    po: parseAsString,
    "sales.rep": parseAsString,
    orderNo: parseAsString,
    "production.assignment": parseAsString,
    "production.status": parseAsString,
    "dispatch.status": parseAsString,
    production: parseAsString,
    // "sales.type": parseAsString,
    // "dispatch.type": parseAsString,
    invoice: parseAsString,
    erf: parseAsString,
    dateRange: parseAsArrayOf(parseAsString),
    showing: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useOrderFilterParams() {
    const [filters, setFilters] = useQueryStates(salesFilterParamsSchema);
    const auth = useAuth();
    // function validateFilter(k: FilterKeys) {
    //     switch (k) {
    //         case "showing":
    //             return auth.roleTitle === "Super Admin";
    //         default:
    //             return true;
    //     }
    // }

    return {
        filters: {
            ...filters,
            showing: auth?.can?.viewSalesManager ? "all sales" : null,
        },
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadOrderFilterParams = createLoader(salesFilterParamsSchema);

