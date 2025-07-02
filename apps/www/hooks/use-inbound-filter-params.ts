import { RouterInputs } from "@api/trpc/routers/_app";
import { useQueryStates } from "nuqs";
import {
    createLoader,
    parseAsArrayOf,
    parseAsString,
    parseAsStringLiteral,
} from "nuqs/server";
import { inboundFilterStatus } from "@gnd/utils/constants";
type FilterKeys = keyof Exclude<RouterInputs["sales"]["inboundSummary"], void>;

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
