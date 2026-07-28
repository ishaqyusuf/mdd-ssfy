"use client";

import { Icons } from "@gnd/ui/icons";

import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import NumberFlow from "@number-flow/react";
import { SummaryCardItem } from "@gnd/ui/custom/summary-card-item";
import { SummaryCardSkeleton } from "@gnd/ui/custom/summary-card-skeleton";

export function WorkOrderTotalSummary() {
    const trpc = useTRPC();
    const idleQueryEnabled = useIdleQueryEnabled(1000);
    const { data, isPending } = useQuery(
        trpc.workOrder.getWorkOrderAnalytic.queryOptions(
            {
                type: "total",
            },
            {
                enabled: idleQueryEnabled,
                refetchOnWindowFocus: false,
                staleTime: 60 * 1000,
            },
        ),
    );
    if (!idleQueryEnabled || isPending) {
        return <SummaryCardSkeleton />;
    }

    return (
        <SummaryCardItem
            path="/work-orders"
            summaryProps={{
                Icon: Icons.ListTodo,
                title: data?.title || "Total Work Orders",
                value: (
                    <NumberFlow
                        value={Number(data?.value?.replace(/,/g, "") || 0)}
                    />
                ),
                subtitle: data?.change,
            }}
        />
    );
}
