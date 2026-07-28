import {
    parseAsArrayOf,
    parseAsBoolean,
    parseAsInteger,
    parseAsJson,
    parseAsString,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

import { useToast } from "@gnd/ui/use-toast";

import { useOnCloseQuery } from "./use-on-close-query";
import { z } from "zod";

export function useCustomerOverviewQuery() {
    const onClose = useOnCloseQuery();
    const [params, setParams] = useQueryStates({
        viewCustomer: parseAsBoolean,
        accountNo: parseAsString,
        tab: parseAsStringEnum([
            "general",
            "sales",
            "quotes",
            "transactions",
            "pay-portal",
        ] as const),
        onCloseQuery: parseAsJson(z.any().parse),
        "pay-selections": parseAsArrayOf(parseAsInteger),
    });
    const opened = params.viewCustomer && !!params.accountNo;
    const { toast } = useToast();
    return {
        pay({
            phoneNo,
            customerId,
            orderId,
        }: {
            phoneNo?: string;
            customerId?: number;
            orderId?: number;
        }) {
            let accountNo = phoneNo
                ? phoneNo
                : customerId
                  ? `cust-${customerId}`
                  : null;
            let error = !accountNo
                ? "Valid customer is required to proceed"
                : !orderId
                  ? "Valid order is required to proceed"
                  : null;

            if (error) {
                toast({
                    title: error,
                    variant: "destructive",
                    duration: 3000,
                });
                return;
            }
            setParams({
                accountNo,
                tab: "pay-portal",
                viewCustomer: true,
                "pay-selections": [Number(orderId)],
            });
        },
        open(accountNo, onCloseQuery?) {
            setParams({
                accountNo,
                viewCustomer: true,
                tab: "general",
                onCloseQuery: onCloseQuery || undefined,
            });
        },
        ...params,
        params,
        setParams,
        opened,
        close() {
            onClose.handle(params, setParams);
        },
    };
}
