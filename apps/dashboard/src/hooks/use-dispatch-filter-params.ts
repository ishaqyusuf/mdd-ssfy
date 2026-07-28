import { useQueryStates } from "nuqs";
import {
    createLoader,
    parseAsStringLiteral,
    parseAsArrayOf,
    parseAsString,
    parseAsInteger,
} from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
import { salesDispatchStatus } from "@gnd/utils/constants";
type FilterKeys = keyof Exclude<RouterInputs["dispatch"]["index"], void>;

export const dispatchFilterParamsSchema = {
    tab: parseAsStringLiteral(["all", "pending", "completed"]),
    status: parseAsStringLiteral(salesDispatchStatus),
    q: parseAsString,
    driversId: parseAsArrayOf(parseAsInteger, ","),
    scheduleDate: parseAsArrayOf(parseAsString, ","),
    view: parseAsStringLiteral(["table", "calendar"]).withDefault("table"),
} satisfies Partial<Record<FilterKeys | "view", any>>;

export function useDispatchFilterParams() {
    const [filters, setFilters] = useQueryStates(dispatchFilterParamsSchema);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadDispatchFilterParams = createLoader(
    dispatchFilterParamsSchema,
);
