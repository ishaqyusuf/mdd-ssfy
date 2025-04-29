import { send } from "process";
import { useEffect, useRef } from "react";
import {
    parseAsArrayOf,
    parseAsBoolean,
    parseAsInteger,
    parseAsString,
    useQueryStates,
} from "nuqs";

import { useLoadingToast } from "./use-loading-toast";

export type SalesEmailSender = ReturnType<typeof useSalesEmailSender>;
export function useSalesEmailSender() {
    const [params, setParams] = useQueryStates({
        withPayment: parseAsBoolean,
        orderIds: parseAsArrayOf(parseAsString),
        ids: parseAsArrayOf(parseAsInteger),
    });

    return {
        params,
        send: setParams,
        clear: () => {
            setParams(null);
        },
    };
}
