import { Suspense } from "react";
import { SummaryCardSkeleton } from "@gnd/ui/custom/summary-card-skeleton";
import { WorkOrderTotalSummary } from "./work-order-total-summary";
import { WorkOrderPendingSummary } from "./work-order-pending-summary";
import { WorkOrderCompletedSummary } from "./work-order-completed-summary";
import { WorkOrderAverageSummary } from "./work-order-average-summary";

export async function WorkOrderSummaryWidgets() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6">
      <Suspense fallback={<SummaryCardSkeleton />}>
        <WorkOrderTotalSummary />
      </Suspense>

      <Suspense fallback={<SummaryCardSkeleton />}>
        <WorkOrderPendingSummary />
      </Suspense>

      <Suspense fallback={<SummaryCardSkeleton />}>
        <WorkOrderCompletedSummary />
      </Suspense>

      <Suspense fallback={<SummaryCardSkeleton />}>
        <WorkOrderAverageSummary />
      </Suspense>
    </div>
  );
}
