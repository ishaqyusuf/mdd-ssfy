"use client";

import { useSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@gnd/ui/icons";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { SalesOrdersV2Summary } from "./sales-orders-v2-summary";

export function SalesOrdersV2Outstanding() {
    const trpc = useTRPC();
    const { filters } = useSalesOrdersV2FilterParams();
    const { data } = useSuspenseQuery(
        trpc.sales.getOrdersV2Summary.queryOptions(filters),
    );

    return (
        <SalesOrdersV2Summary
            data={data}
            title="Outstanding"
            subtitle="Open balance remaining."
            icon={Icons.Receipt}
            value={data.outstandingBalance}
            money
            masked
        />
    );
}
