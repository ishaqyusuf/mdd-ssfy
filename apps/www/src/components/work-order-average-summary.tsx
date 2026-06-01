"use client";

import { Icons } from "@gnd/ui/icons";

import { useIdleQueryEnabled } from "@/hooks/use-idle-query-enabled";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { SummaryCardItem } from "@gnd/ui/custom/summary-card-item";
import { SummaryCardSkeleton } from "@gnd/ui/custom/summary-card-skeleton";

export function WorkOrderAverageSummary() {
    const trpc = useTRPC();
    const idleQueryEnabled = useIdleQueryEnabled(1000);
    const { data, isPending } = useQuery(
        trpc.workOrder.getWorkOrderAnalytic.queryOptions(
            {
                type: "avg",
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
                Icon: Icons.Activity,
                title: data?.title || "Avg. Completion",
                value: data?.value || "0 days",
                subtitle: data?.change,
            }}
        />
    );
}
