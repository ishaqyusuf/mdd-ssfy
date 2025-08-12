import {
    parseAsArrayOf,
    parseAsInteger,
    parseAsString,
    useQueryStates,
} from "nuqs";
import { createLoader } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["sales"]["productions"], void>;

export const salesProductionFilterParamsSchema = {
    q: parseAsString,
    assignedToId: parseAsInteger,
    production: parseAsString,
    salesNo: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useSalesProductionFilterParams() {
    const [filters, setFilters] = useQueryStates(
        salesProductionFilterParamsSchema,
    );
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadSalesProductionFilterParams = createLoader(
    salesProductionFilterParamsSchema,
);

