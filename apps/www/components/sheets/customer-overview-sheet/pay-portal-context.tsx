import { useEffect, useState } from "react";
import { cancelTerminaPaymentAction } from "@/actions/cancel-terminal-payment-action";
import { createSalesPaymentAction } from "@/actions/create-sales-payment";
import { getCustomerPayPortalAction } from "@/actions/get-customer-pay-portal-action";
import { getTerminalPaymentStatusAction } from "@/actions/get-terminal-payment-status";
import { createPaymentSchema } from "@/actions/schema";
import { revalidateTable } from "@/components/(clean-code)/data-table/use-infinity-data-table";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import {
    DataSkeletonProvider,
    useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { formatMoney } from "@/lib/use-number";
import { cn, generateRandomString, sum } from "@/lib/utils";
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

    const [waitSeconds, setWaitSeconds] = useState(null);
    const [waitTok, setWaitTok] = useState(null);
    useEffect(() => {
        if (waitTok) {
            setWaitTok(null);
            setWaitSeconds((waitSeconds || 0) + 1);
            checkTerminalStatus();
        }
    }, [waitTok, waitSeconds]);
    // const pToast = usePaymentToast();
    const toast = useLoadingToast();
    async function terminalPaymentSuccessful() {
        makePayment.execute({
            ...form.getValues(),
            // squarePaymentId,
        });
    }
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
            console.log(args);
            if (args.data?.terminalPaymentSession) {
                toast.loading("", toastDetail("terminal-waiting"));
                // pToast.updateNotification("terminal-waiting");
                setWaitSeconds(0);
                form.setValue(
                    "terminalPaymentSession",
                    args.data.terminalPaymentSession,
                );
            } else {
                if (args.data.status) {
                    // pToast.updateNotification("payment-success");
                    toast.success("", toastDetail("payment-success"));
                    revalidateTable();
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
            console.log(error);
            staticPaymentData.description = error.error?.serverError;
            toast.error("", toastDetail("failed"));
        },
    });
    const cancelTerminalPayment = useAction(cancelTerminaPaymentAction, {
        onSuccess: (args) => {
            setWaitSeconds(null);
            form.setValue("terminalPaymentSession", null);
            toast.success("", toastDetail("terminal-cancelled"));
        },
    });
    function terminalManualAcceptPayment(e) {
        toast.loading("", toastDetail("terminal-waiting"));
        setWaitSeconds(0);
        setWaitTok(generateRandomString());
    }
    staticPaymentData.accept = terminalManualAcceptPayment;
    useEffect(() => {
        if (terminalPaymentSession) checkTerminalStatus();
    }, [terminalPaymentSession]);
    function checkTerminalStatus() {
        setTimeout(
            () => {
                if (waitSeconds > 15) {
                    toast.loading("", toastDetail("terminal-long-waiting"));
                } else toast.loading("", toastDetail("terminal-waiting"));
                if (waitSeconds > 17) {
                    setWaitTok(null);
                    return;
                }
                if (mockStatus) processTerminalPaymentStatus(mockStatus);
                checkTerminalPaymentStatus.execute({
                    checkoutId: terminalPaymentSession.squareCheckoutId,
                    squarePaymentId: terminalPaymentSession.squarePaymentId,
                });
            },
            waitSeconds > 5 ? 2000 : waitSeconds > 10 ? 3000 : 1500,
        );
    }
    const [mockStatus, setMockStatus] = useState<TerminalCheckoutStatus>(null);
    function processTerminalPaymentStatus(status: TerminalCheckoutStatus) {
        if (status == "COMPLETED") {
            setWaitSeconds(null);
            setWaitTok(null);
        }
        switch (status) {
            case "COMPLETED":
                // form.setValue("terminal.tip", response.tip);
                form.setValue("terminalPaymentSession.status", "COMPLETED");
                terminalPaymentSuccessful();
                break;
            case "CANCELED":
            case "CANCEL_REQUESTED":
                form.setValue("terminalPaymentSession.status", "CANCELED");
                cancelTerminalPayment.execute({
                    checkoutId: terminalPaymentSession.squareCheckoutId,
                });
                toast.error("", toastDetail("terminal-cancelled"));
                break;
            default:
                setWaitTok(generateRandomString());
                // setWaitSeconds((waitSeconds || 0) + 1);
                // checkTerminalStatus();
                break;
        }
    }
    const checkTerminalPaymentStatus = useAction(
        getTerminalPaymentStatusAction,
        {
            onSuccess: (args) => {
                processTerminalPaymentStatus(args.data.status);
            },
            onError(args) {
                console.log(args);
                toast.error("", toastDetail("terminal-cancelled"));
            },
        },
    );

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
                duration: Number.POSITIVE_INFINITY,
                variant: "spinner",
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
