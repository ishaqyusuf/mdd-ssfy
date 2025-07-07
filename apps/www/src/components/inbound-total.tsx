"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { InboundSummary } from "./inbound-summary";
import { useInboundFilterParams } from "@/hooks/use-inbound-filter-params";

export function InboundTotal() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.sales.inboundSummary.queryOptions({
            status: "total",
        }),
    );
    const { setFilter } = useInboundFilterParams();

    return (
        <button
            type="button"
            onClick={() =>
                setFilter({
                    status: null,
                })
            }
            style={{
                backgroundColor: "#66c8bfd9",
            }}
            className="hidden sm:block text-left"
        >
            <InboundSummary count={data} title="Total" />
        </button>
    );
}
