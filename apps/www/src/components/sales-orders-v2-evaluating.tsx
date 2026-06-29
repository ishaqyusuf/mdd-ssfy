"use client";

import { useSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@gnd/ui/icons";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { SalesOrdersV2Summary } from "./sales-orders-v2-summary";

export function SalesOrdersV2Evaluating() {
    const trpc = useTRPC();
    const { filters } = useSalesOrdersV2FilterParams();
    const { data } = useSuspenseQuery(
        trpc.sales.getOrdersSummary.queryOptions(filters),
    );

    return (
        <SalesOrdersV2Summary
            data={data}
            title="Evaluating"
            subtitle="Still in review."
            icon={Icons.TimerReset}
            value={data.evaluatingOrders}
        />
    );
}
