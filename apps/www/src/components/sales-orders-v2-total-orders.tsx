"use client";

import { useSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { Icons } from "@gnd/ui/icons";
import { SalesOrdersV2Summary } from "./sales-orders-v2-summary";

export function SalesOrdersV2TotalOrders() {
    const trpc = useTRPC();
    const { filters } = useSalesOrdersV2FilterParams();
    const { data } = useSuspenseQuery(
        trpc.sales.getOrdersV2Summary.queryOptions(filters),
    );

    return (
        <SalesOrdersV2Summary
            data={data}
            title="Orders"
            subtitle="Filtered order count."
            icon={Icons.ClipboardList}
            value={data.totalOrders}
        />
    );
}
