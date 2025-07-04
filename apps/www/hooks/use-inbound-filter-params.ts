import { useQueryStates } from "nuqs";
import { createLoader, parseAsStringLiteral } from "nuqs/server";
import { inboundFilterStatus } from "@gnd/utils/constants";
import { InboundQuerySchema } from "@api/schemas/sales";
type FilterKeys = keyof InboundQuerySchema;

export const inboundFilterParamsSchema = {
    status: parseAsStringLiteral(inboundFilterStatus),
} satisfies Partial<Record<FilterKeys, any>>;

export function useInboundFilterParams() {
    const [filter, setFilter] = useQueryStates(inboundFilterParamsSchema);
    return {
        filter,
        setFilter,
        hasFilters: Object.values(filter).some((value) => value !== null),
    };
}
export const loadInboundFilterParams = createLoader(inboundFilterParamsSchema);
