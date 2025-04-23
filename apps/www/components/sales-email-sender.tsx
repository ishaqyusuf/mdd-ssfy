"use client";

import { useEffect } from "react";
import { __sendInvoiceEmailTrigger } from "@/actions/triggers/send-invoice-email";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesEmailSender } from "@/hooks/use-sales-email-sender";

export function SalesEmailSender() {
    const _ctx = useSalesEmailSender();
    const loader = useLoadingToast();
    useEffect(() => {
        if (_ctx.params.ids) {
            console.log("SENDING EMAIL>>>>>>>>>");
            loader.loading("Sending Email...");
        }
    }, [_ctx.params.ids]);
    const ctx = {
        send({ ids, orderIds, withPayment = false }) {
            loader.display({
                variant: "spinner",
                title: "Sending Email...",
                duration: Number.POSITIVE_INFINITY,
            });
            return __sendInvoiceEmailTrigger({
                ids,
                orderIds,
                withPayment,
            })
                .catch((e) => {
                    loader.error("Unable to complete");
                })
                .then((a) => {
                    loader.success("Unable to complete");
                });
        },
    };
    return null;
}
