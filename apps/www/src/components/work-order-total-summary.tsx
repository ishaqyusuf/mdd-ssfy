"use client";

import { Icons } from "@gnd/ui/icons";

import { _trpc } from "@/components/static-trpc";
import { useSuspenseQuery } from "@gnd/ui/tanstack";
import NumberFlow from "@number-flow/react";
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
        Icon: Icons.ListTodo,
        title: data?.title || "Total Work Orders",
        value: <NumberFlow value={Number(data?.value?.replace(/,/g, "") || 0)} />,
        subtitle: data?.change,
      }}
    />
  );
}
