import { useEffect, useState } from "react";
import { cancelTerminaPaymentAction } from "@/actions/cancel-terminal-payment-action";
import { createSalesPaymentAction } from "@/actions/create-sales-payment";
import { getCustomerPayPortalAction } from "@/actions/get-customer-pay-portal-action";
import {
    getTerminalPaymentStatusAction,
    terminalPaymentStatus,
} from "@/actions/get-terminal-payment-status";
import { createPaymentSchema } from "@/actions/schema";
import { revalidateTable } from "@/components/(clean-code)/data-table/use-infinity-data-table";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import {
    DataSkeletonProvider,
    useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { timeout } from "@/lib/timeout";
import { formatMoney } from "@/lib/use-number";
import { generateRandomString, sum } from "@/lib/utils";
import { TerminalCheckoutStatus } from "@/modules/square";
import { printSalesData } from "@/utils/sales-print-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ToastAction } from "@gnd/ui/toast";
import { useToast } from "@gnd/ui/use-toast";

export function usePayPortal() {
    const query = useCustomerOverviewQuery();

    const loader = async () =>
        await getCustomerPayPortalAction(query.accountNo);
    const skel = useCreateDataSkeletonCtx({
        loader,
        autoLoad: true,
    });
    const data = skel?.data;
    const selections = query.params?.["pay-selections"];
    useEffect(() => {
        const amountDue = sum(
            data?.pendingSales?.filter((a) => selections?.includes(a.id)),
            "amountDue",
        );
        form.setValue("amount", formatMoney(amountDue));
    }, [selections, data]);
    const form = useForm<z.infer<typeof createPaymentSchema>>({
        resolver: zodResolver(createPaymentSchema),
        defaultValues: {
            // terminal: null as CreateTerminalPaymentAction["resp"],
            paymentMethod: undefined,
            accountNo: query?.params?.accountNo,
            salesIds: query?.params?.["pay-selections"],
            amount: undefined,
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
                .map((a) => a.orderId),
        );
    }, [query.params?.["pay-selections"], data?.pendingSales]);
    const pm = form.watch("paymentMethod");
    const terminalPaymentSession = form.watch("terminalPaymentSession");
    const salesQ = useSalesOverviewQuery();
    const makePayment = useAction(createSalesPaymentAction, {
        onSuccess: (args) => {
            if (args.data?.terminalPaymentSession) {
                toast.loading("", toastDetail("terminal-waiting"));
                form.setValue(
                    "terminalPaymentSession",
                    args.data.terminalPaymentSession,
                );
                setTimeout(() => {
                    setWaitSeconds(0);
                }, 2000);
            } else {
                if (args.data.status) {
                    form.setValue("terminalPaymentSession", null);
                    toast.success("", toastDetail("payment-success"));
                    revalidateTable();
                    query.setParams({
                        "pay-selections": null,
                        tab: "transactions",
                    });
                    setTimeout(() => {
                        if (salesQ?.params?.["sales-overview-id"]) {
                            salesQ._refreshToken();
                            query?.setParams(null);
                        }
                        printSalesData({
                            mode: "order",
                            slugs: args.input.orderNos?.join(","),
                        });
                    }, 1000);
                }
            }
        },
        onError(error) {
            staticPaymentData.description = error.error?.serverError;
            toast.error("", toastDetail("failed"));
        },
    });
    const cancelTerminalPayment = useAction(cancelTerminaPaymentAction, {
        onSuccess: (args) => {
            setWaitSeconds(null);
            form.setValue("terminalPaymentSession", null);
            toast.success("", toastDetail("terminal-cancelled"));
            //  toast.error("", toastDetail("terminal-cancelled"));
        },
        onError(e) {
            toast.error("Unable to cancel payment");
        },
    });
    const [waitSeconds, setWaitSeconds] = useState(null);
    function terminalManualAcceptPayment(e) {
        toast.loading("", toastDetail("terminal-waiting"));
    }
    useEffect(() => {
        if (!terminalPaymentSession) return;
        async function checkTerminalPaymentStatus() {
            console.log({ terminalPaymentSession });
            console.log("CHECKING PAYMENT STATUS", waitSeconds, mockStatus);
            const rep = mockStatus
                ? { status: mockStatus }
                : await terminalPaymentStatus(
                      terminalPaymentSession?.squareCheckoutId,
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
        skel,
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
                toast.loading("", toastDetail("loading"));
            },
        },
    };
}
type Status =
    | "idle"
    | "loading"
    | "terminal-waiting"
    | "terminal-long-waiting"
    | "terminal-success"
    | "terminal-cancelled"
    | "failed"
    | "payment-success";
const staticPaymentData = {
    description: null,
    accept: null,
};
type Toast = Parameters<ReturnType<typeof useToast>["update"]>[1];
function toastDetail(status: Status, description?): Partial<Toast> | null {
    if (!description) description = staticPaymentData.description;
    staticPaymentData.description = null;
    switch (status) {
        case "loading":
            return {
                // id: toastId,
                title: `Generating payment...`,
                duration: Number.POSITIVE_INFINITY,
                variant: "spinner",
                // action
            };
        case "terminal-waiting":
            return {
                // id: toastId,
                title: `Waiting to accept payment...`,
                description,
                duration: Number.POSITIVE_INFINITY,
                variant: "spinner",
                action: null,
            };
        case "terminal-long-waiting":
            return {
                // id: toastId,
                title: `Payment taking too long...`,
                description: `This may be a network problem. Have you received payment?`,
                duration: Number.POSITIVE_INFINITY,
                variant: "spinner",

                action: (
                    <ToastAction
                        altText="payment-received"
                        onClick={(e) => {
                            e.preventDefault();
                            staticPaymentData.accept?.();
                        }}
                    >
                        <span>Yes</span>
                    </ToastAction>
                ),
            };
        case "terminal-cancelled":
            return {
                // id: toastId,
                title: `Terminal payment cancelled...`,
                duration: 1500,
                variant: "error",
            };
        case "payment-success":
            return {
                // id: toastId,
                title: `Payment successful`,
                variant: "success",
                duration: 3000,
            };
        case "failed":
            return {
                // id: toastId,
                description,
                title: `Payment Failed, try again`,
                variant: "error",
                duration: 3000,
            };
        default:
            return null;
    }
}
