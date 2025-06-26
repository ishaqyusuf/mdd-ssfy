"use client";

import { useEffect, useRef } from "react";
import { __sendInvoiceEmailTrigger } from "@/actions/triggers/send-invoice-email";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesEmailSender } from "@/hooks/use-sales-email-sender";

export function SalesEmailSender() {
    const { params, clear } = useSalesEmailSender();
    const loader = useLoadingToast();
    const r = useRef(false);
    useEffect(() => {
        if (params.ids) {
            if (!r.current) {
                r.current = true;

                loader.loading("Sending Email...");

                //  loader.display({
                //     variant: "spinner",
                //     title: "Sending Email...",
                //     duration: Number.POSITIVE_INFINITY,
                // });
                const fn = async () => {
                    try {
                        const resp = await __sendInvoiceEmailTrigger({
                            ids: params.ids ? params.ids.join(",") : undefined,
                            orderIds: params.orderIds
                                ? params.orderIds.join(",")
                                : undefined,
                            withPayment: params.withPayment,
                        });
                        console.log(resp);

                        loader.success("Email Sent");
                        clear();
                    } catch (error) {
                        if (error instanceof Error) {
                            loader.error(
                                error?.message || "Unable to complete",
                                {
                                    description: error?.cause as string,
                                },
                            );
                            clear();
                        }
                    }
                };
                fn();
            }
        } else r.current = false;
    }, [params]);

    return null;
}
