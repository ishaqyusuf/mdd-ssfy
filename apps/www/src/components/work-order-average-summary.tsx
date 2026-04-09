"use client";

import { Icons } from "@gnd/ui/icons";

import { _trpc } from "@/components/static-trpc";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { SummaryCardItem } from "@gnd/ui/custom/summary-card-item";

export function WorkOrderAverageSummary() {
  const { data } = useSuspenseQuery(
    _trpc.workOrder.getWorkOrderAnalytic.queryOptions({
      type: "avg",
    })
  );

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
