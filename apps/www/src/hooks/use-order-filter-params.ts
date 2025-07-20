import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { createLoader } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["sales"]["index"], void>;

export const orderFilterParamsSchema = {
    q: parseAsString,
    "customer.name": parseAsString,
    phone: parseAsString,
    po: parseAsString,
    "sales.rep": parseAsString,
    "order.no": parseAsString,
    "production.assignment": parseAsString,
    "production.status": parseAsString,
    "dispatch.status": parseAsString,
    // "sales.type": parseAsString,
    // "dispatch.type": parseAsString,
    invoice: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useOrderFilterParams() {
    const [filters, setFilters] = useQueryStates(orderFilterParamsSchema);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadOrderFilterParams = createLoader(orderFilterParamsSchema);

