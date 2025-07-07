"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { InboundSummary } from "./inbound-summary";
import { useInboundFilterParams } from "@/hooks/use-inbound-filter-params";

export function InboundMissingItems() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.sales.inboundSummary.queryOptions({
            status: "missing items",
        }),
    );
    const { setFilter } = useInboundFilterParams();

    return (
        <button
            type="button"
            style={{
                backgroundColor: "#eba360",
            }}
            onClick={() =>
                setFilter({
                    status: "missing items",
                })
            }
            className="hidden sm:block text-left"
        >
            <InboundSummary
                count={data}
                // totalInvoiceCount={totalInvoiceCount ?? 0}
                title="Missing Items"
            />
        </button>
    );
}
