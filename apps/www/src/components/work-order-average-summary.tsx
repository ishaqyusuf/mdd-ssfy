"use client";

import { _trpc } from "@/components/static-trpc";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import { Activity } from "lucide-react";
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
        Icon: Activity,
        title: data?.title || "Avg. Completion",
        value: data?.value || "0 days",
        subtitle: data?.change,
      }}
    />
  );
}
