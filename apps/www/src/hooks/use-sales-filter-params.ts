import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { createLoader } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
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
} satisfies Partial<Record<FilterKeys, any>>;

export function useOrderFilterParams() {
    const [filters, setFilters] = useQueryStates(salesFilterParamsSchema);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadOrderFilterParams = createLoader(salesFilterParamsSchema);

