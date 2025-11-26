"use client";

import { _trpc } from "@/components/static-trpc";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import NumberFlow from "@number-flow/react";
import { CheckCircle } from "lucide-react";
import { SummaryCardItem } from "@gnd/ui/custom/summary-card-item";

export function WorkOrderCompletedSummary() {
  const { data } = useSuspenseQuery(
    _trpc.workOrder.getWorkOrderAnalytic.queryOptions({
      type: "completed",
    })
  );

  return (
    <SummaryCardItem
      path="/work-orders?status=completed"
      summaryProps={{
        Icon: CheckCircle,
        title: data?.title || "Completed",
        value: <NumberFlow value={Number(data?.value?.replace(/,/g, "") || 0)} />,
        subtitle: data?.change,
      }}
    />
  );
}
