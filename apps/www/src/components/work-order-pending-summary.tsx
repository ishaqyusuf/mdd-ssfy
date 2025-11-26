"use client";

import { _trpc } from "@/components/static-trpc";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import NumberFlow from "@number-flow/react";
import { Clock } from "lucide-react";
import { SummaryCardItem } from "@gnd/ui/custom/summary-card-item";

export function WorkOrderPendingSummary() {
  const { data } = useSuspenseQuery(
    _trpc.workOrder.getWorkOrderAnalytic.queryOptions({
      type: "pending",
    })
  );

  return (
    <SummaryCardItem
      path="/work-orders?status=pending"
      summaryProps={{
        Icon: Clock,
        title: data?.title || "Pending",
        value: <NumberFlow value={Number(data?.value?.replace(/,/g, "") || 0)} />,
        subtitle: data?.change,
      }}
    />
  );
}
