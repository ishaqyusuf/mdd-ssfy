import { useEffect, useState } from "react";

import { ToastAction } from "@gnd/ui/toast";
import { useToast } from "@gnd/ui/use-toast";

import { useCustomerOverviewQuery } from "./use-customer-overview-query";
import { useLoadingToast } from "./use-loading-toast";

type Status =
    | "idle"
    | "loading"
    | "terminal-waiting"
    | "terminal-long-waiting"
    | "terminal-success"
    | "terminal-cancelled"
    | "failed"
    | "payment-success";
export const staticPaymentData = {
    accept: null,
    description: null,
};
export function usePaymentToast() {
    const query = useCustomerOverviewQuery();
    const [status, setStatus] = useState<Status>(null);
    const { toast, update, dismiss } = useToast();
    const [toastId, setToastId] = useState(null);
    const toaster = useLoadingToast();
    useEffect(() => {
        if (!status) return;
        const toastData = toastDetail(status, toastId);
        if (!toastId) {
            const { id } = toast(toastData);
            setToastId(id);
        } else {
            // update(toastId, toastData);
            switch (status) {
                case "failed":
                case "terminal-cancelled":
                    setStatus(null as any);
                    setToastId(null);
                    //     r.dismiss();
                    break;
                case "payment-success":
                case "terminal-success":
                    query.setParams({
                        tab: "transactions",
                    });
            }
        }
    }, [status, toastId]);
    const r = {
        idle: !status || status == "idle",
        dismiss() {
            if (toastId) {
                setToastId(null);
                dismiss(toastId);
                setStatus(null as any);
            }
        },
        updateNotification(status: Status) {
            toaster.display({
                ...toastDetail(status),
            });
            setStatus(status);
        },
    };
    return r;
}

type Toast = Parameters<ReturnType<typeof useToast>["update"]>[1];

export function toastDetail(
    status: Status,
    description?,
): Partial<Toast> | null {
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
