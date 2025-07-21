import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { createLoader, parseAsStringLiteral } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
import { inboundFilterStatus } from "@gnd/utils/constants";
type FilterKeys = keyof Exclude<RouterInputs["dispatch"]["index"], void>;

export const dispatchFilterParamsSchema = {
    status: parseAsStringLiteral(inboundFilterStatus),
    q: parseAsString,
    scheduleDate: parseAsArrayOf(parseAsString, ","),
} satisfies Partial<Record<FilterKeys, any>>;

export function useDispatchFilterParams() {
    const [filters, setFilters] = useQueryStates(dispatchFilterParamsSchema);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadInboundFilterParams = createLoader(dispatchFilterParamsSchema);
