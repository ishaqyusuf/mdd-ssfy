"use client";

import { _trpc } from "@/components/static-trpc";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import NumberFlow from "@number-flow/react";
import { ListTodo } from "lucide-react";
import { SummaryCardItem } from "@gnd/ui/custom/summary-card-item";

export function WorkOrderTotalSummary() {
  const { data } = useSuspenseQuery(
    _trpc.workOrder.getWorkOrderAnalytic.queryOptions({
      type: "total",
    })
  );

  return (
    <SummaryCardItem
      path="/work-orders"
      summaryProps={{
        Icon: ListTodo,
        title: data?.title || "Total Work Orders",
        value: <NumberFlow value={Number(data?.value?.replace(/,/g, "") || 0)} />,
        subtitle: data?.change,
      }}
    />
  );
}
