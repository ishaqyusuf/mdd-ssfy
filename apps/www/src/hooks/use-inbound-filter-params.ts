import {
    parseAsInteger,
    parseAsJson,
    parseAsString,
    useQueryStates,
} from "nuqs";
import { createLoader, parseAsStringLiteral } from "nuqs/server";
import { inboundFilterStatus } from "@gnd/utils/constants";
import { RouterInputs } from "@api/trpc/routers/_app";
import { Item } from "@/components/tables/inbound-managment/columns";
type FilterKeys = keyof Exclude<RouterInputs["sales"]["inboundIndex"], void>;

export const inboundFilterParamsSchema = {
    status: parseAsStringLiteral(inboundFilterStatus),
    q: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useInboundFilterParams() {
    const [filter, setFilter] = useQueryStates(inboundFilterParamsSchema);
    return {
        filter,
        setFilter,
        hasFilters: Object.values(filter).some((value) => value !== null),
    };
}
export function useInboundView() {
    const [params, setParams] = useQueryStates({
        viewInboundId: parseAsInteger,
        payload: parseAsJson<Item>(null as any),
    });
    return {
        params,
        setParams,
    };
}
export const loadInboundFilterParams = createLoader(inboundFilterParamsSchema);
