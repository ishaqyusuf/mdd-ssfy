"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { InboundSummary } from "./inbound-summary";
import { useInboundFilterParams } from "@/hooks/use-inbound-filter-params";

export function InboundComplete() {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.sales.inboundSummary.queryOptions({
            status: "complete",
        }),
    );
    const { setFilter } = useInboundFilterParams();

    // const totalInvoiceCount = data?.reduce(
    //     (acc, curr) => acc + (curr.invoiceCount ?? 0),
    //     0,
    // );

    return (
        <button
            type="button"
            onClick={() =>
                setFilter({
                    status: "complete",
                })
            }
            style={{
                backgroundColor: "#7a60eb",
            }}
            className="hidden sm:block text-left"
        >
            <InboundSummary
                count={data}
                // totalInvoiceCount={totalInvoiceCount ?? 0}
                title="Complete"
            />
        </button>
    );
}
