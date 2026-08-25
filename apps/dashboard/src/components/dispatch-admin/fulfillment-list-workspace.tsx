import { AdminDispatchHeader } from "@/components/dispatch-admin/admin-dispatch-header";
import {
	DriverWorkloadCard,
	DriverWorkloadSkeleton,
} from "@/components/dispatch-admin/driver-workload-card";
import { FulfillmentOverview } from "@/components/dispatch-admin/fulfillment-overview";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables-2/sales-dispatch/data-table";
import { SalesDispatchSkeleton } from "@/components/tables-2/sales-dispatch/skeleton";
import type { TableSettings } from "@/utils/table-settings";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export function FulfillmentListWorkspace({
	initialSettings,
}: {
	initialSettings: Partial<TableSettings>;
}) {
	return (
		<div className="flex flex-col gap-6">
			<FulfillmentOverview />

			<AdminDispatchHeader />

			<div className="flex items-start gap-6">
				<div className="min-w-0 flex-1">
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<SalesDispatchSkeleton compact initialSettings={initialSettings} />}>
							<DataTable compact enableSalesMarkAs initialSettings={initialSettings} />
						</Suspense>
					</ErrorBoundary>
				</div>

				<div className="hidden w-64 shrink-0 xl:block">
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<DriverWorkloadSkeleton />}>
							<DriverWorkloadCard />
						</Suspense>
					</ErrorBoundary>
				</div>
			</div>
		</div>
	);
}
