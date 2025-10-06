"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { InboundSummary } from "./inbound-summary";
import { useInboundFilterParams } from "@/hooks/use-inbound-filter-params";

export function InboundBackOrder() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.sales.inboundSummary.queryOptions({
            status: "back order",
        }),
    );
    const { setFilter } = useInboundFilterParams();

    return (
        <button
            type="button"
            style={{
                backgroundColor: "#af69df",
            }}
            onClick={() =>
                setFilter({
                    status: "back order",
                })
            }
            className="hidden sm:block text-left"
        >
            <InboundSummary
                count={data}
                // totalInvoiceCount={totalInvoiceCount ?? 0}
                title="Back Order"
            />
        </button>
    );
}
