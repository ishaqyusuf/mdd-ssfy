import { useEffect, useState } from "react";
import { cancelTerminaPaymentAction } from "@/actions/cancel-terminal-payment-action";
import { createSalesPaymentAction } from "@/actions/create-sales-payment";

import { terminalPaymentStatus } from "@/actions/get-terminal-payment-status";
import { createPaymentSchema } from "@/actions/schema";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { formatMoney } from "@/lib/use-number";
import { sum } from "@/lib/utils";
import { TerminalCheckoutStatus } from "@gnd/square";
import { printSalesData } from "@/utils/sales-print-utils";
import { useAction } from "next-safe-action/hooks";

import { ToastAction } from "@gnd/ui/toast";
import { useToast } from "@gnd/ui/use-toast";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { useZodForm } from "@/hooks/use-zod-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";

export function usePayPortal() {
    const query = useCustomerOverviewQuery();

    const { data, error, isPending } = useSuspenseQuery(
        _trpc.customers.getCustomerPayPortal.queryOptions({
            accountNo: query?.params?.accountNo,
        })
    );
    const selections = query.params?.["pay-selections"];
    useEffect(() => {
        const amountDue = sum(
            data?.pendingSales?.filter((a) => selections?.includes(a.id)),
            "amountDue"
        );
        form.setValue("amount", formatMoney(amountDue), {
            shouldValidate: true,
        });
        form.setValue("_amount", formatMoney(amountDue), {
            shouldValidate: true,
        });
    }, [selections, data]);
    const form = useZodForm(createPaymentSchema, {
        defaultValues: {
            // terminal: null as CreateTerminalPaymentAction["resp"],
            paymentMethod: undefined,
            accountNo: query?.params?.accountNo,
            salesIds: query?.params?.["pay-selections"],
            amount: undefined,
            _amount: undefined,
            // squarePaymentId: undefined,
            // paymentMethod: tx.paymentMethod,
            // amount: tx.totalPay,
            checkNo: undefined,
            deviceId: undefined,
            enableTip: undefined,
            terminalPaymentSession: undefined,
        },
    });
    // const pToast = usePaymentToast();
    const toast = useLoadingToast();
    useEffect(() => {
        const selections = query.params?.["pay-selections"];
        form.setValue("salesIds", selections);
        form.setValue(
            "orderNos",
            data?.pendingSales
                ?.filter((a) => selections?.includes(a.id))
                .map((a) => a.orderId)
        );
    }, [query.params?.["pay-selections"], data?.pendingSales]);
    const pm = form.watch("paymentMethod");
    const terminalPaymentSession = form.watch("terminalPaymentSession");
    const salesQ = useSalesOverviewQuery();
    const sq = useSalesQueryClient();
    const makePayment = useAction(createSalesPaymentAction, {
        onSuccess: (args) => {
            if (args.data?.terminalPaymentSession) {
                toast;
                //toast.loading("", toastDetail("terminal-waiting") as any);
                form.setValue(
                    "terminalPaymentSession",
                    args.data.terminalPaymentSession
                );
                setTimeout(() => {
                    setWaitSeconds(0);
                }, 2000);
            } else {
                if (args.data.status) {
                    form.setValue("terminalPaymentSession", null);
                    //toast.success("", toastDetail("payment-success") as any);
                    sq.invalidate.salesList();
                    query.setParams({
                        "pay-selections": null,
                        tab: "transactions",
                    });
                    setTimeout(() => {
                        if (salesQ?.params?.["sales-overview-id"]) {
                            salesQ.salesQuery.salesPaymentUpdated();
                            query?.setParams(null);
                        }
                        printSalesData({
                            mode: "order-packing",
                            slugs: args.input.orderNos?.join(","),
                        });
                    }, 1000);
                }
            }
        },
        onError(error) {
            staticPaymentData.description = error.error?.serverError;
            //toast.error("", toastDetail("failed") as any);
        },
    });
    const cancelTerminalPayment = useAction(cancelTerminaPaymentAction, {
        onSuccess: (args) => {
            setWaitSeconds(null);
            form.setValue("terminalPaymentSession", null);
            //toast.success("", toastDetail("terminal-cancelled") as any);
            //  //toast.error("", toastDetail("terminal-cancelled"));
        },
        onError(e) {
            //toast.error("Unable to cancel payment");
        },
    });
    const [waitSeconds, setWaitSeconds] = useState(null);
    function terminalManualAcceptPayment(e) {
        //toast.loading("", toastDetail("terminal-waiting") as any);
    }
    useEffect(() => {
        if (!terminalPaymentSession) return;
        async function checkTerminalPaymentStatus() {
            const rep = mockStatus
                ? { status: mockStatus }
                : await terminalPaymentStatus(
                      terminalPaymentSession?.squareCheckoutId
                  );
            switch (rep.status) {
                case "COMPLETED":
                    form.setValue("terminalPaymentSession.status", "COMPLETED");
                    makePayment.execute({
                        ...form.getValues(),
                    });
                    return null;
                case "CANCELED":
                case "CANCEL_REQUESTED":
                    cancelTerminalPayment.execute({
                        checkoutId: terminalPaymentSession.squareCheckoutId,
                        squarePaymentId: terminalPaymentSession.squarePaymentId,
                    });
                    return null;
            }
            // return generateRandomString();
            setTimeout(() => {
                setWaitSeconds(waitSeconds + 1);
            }, 2000);
        }
        if (waitSeconds != null) {
            checkTerminalPaymentStatus();
        }
    }, [waitSeconds, terminalPaymentSession]);
    staticPaymentData.accept = terminalManualAcceptPayment;
    // useEffect(() => {
    //     if (terminalPaymentSession) waitForTerminalPayment();
    // }, [terminalPaymentSession]);

    const [mockStatus, setMockStatus] = useState<TerminalCheckoutStatus>(null);

    return {
        data,
        loading: isPending,
        selections,
        query,
        terminalPaymentSession,
        setMockStatus,
        form,
        makePayment,
        pm,
        toast: {
            toast,
            start() {
                //toast.loading("", toastDetail("loading") as any);
            },
        },
    };
}

const staticPaymentData = {
    description: null,
    accept: null,
};
