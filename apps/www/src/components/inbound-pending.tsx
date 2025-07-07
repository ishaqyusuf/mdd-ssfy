"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { InboundSummary } from "./inbound-summary";
import { useInboundFilterParams } from "@/hooks/use-inbound-filter-params";

export function InboundPending() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.sales.inboundSummary.queryOptions({
            status: "pending",
        }),
    );
    const { setFilter } = useInboundFilterParams();

    return (
        <button
            style={{
                backgroundColor: "#cdeb60",
            }}
            type="button"
            onClick={() =>
                setFilter({
                    status: "pending",
                })
            }
            className="hidden sm:block text-left"
        >
            <InboundSummary
                count={data}
                // totalInvoiceCount={totalInvoiceCount ?? 0}
                title="Pending"
            />
        </button>
    );
}
