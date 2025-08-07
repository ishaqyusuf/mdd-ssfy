import { RouterInputs } from "@api/trpc/routers/_app";
import { PrintInvoice } from "@sales/exports";
import {
    parseAsArrayOf,
    parseAsBoolean,
    parseAsInteger,
    parseAsString,
    useQueryStates,
} from "nuqs";

type FilterKeys = keyof PrintInvoice;

export const paramsSchema = {
    ids: parseAsArrayOf(parseAsInteger),
    slug: parseAsArrayOf(parseAsString),
    mode: parseAsString,
    type: parseAsString,
    access: parseAsString,
    dispatchId: parseAsInteger,
    preview: parseAsBoolean,
    modal: parseAsBoolean,
} satisfies Partial<Record<FilterKeys, any>>;
export function useSalesPrintParams() {
    const [params, setParams] = useQueryStates(paramsSchema);

    return {
        params,
        setParams,

        close() {
            setParams(null);
        },
    };
}

