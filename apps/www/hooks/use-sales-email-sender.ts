import { __sendInvoiceEmailTrigger } from "@/actions/triggers/send-invoice-email";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

import { useLoadingToast } from "./use-loading-toast";

export type SalesEmailSender = ReturnType<typeof useSalesEmailSender>;
export function useSalesEmailSender() {
    const [params, setParams] = useQueryStates({
        withPayment: parseAsBoolean,
        orderIds: parseAsString,
        ids: parseAsString,
    });

    return {
        params,
        setParams,
    };
}
