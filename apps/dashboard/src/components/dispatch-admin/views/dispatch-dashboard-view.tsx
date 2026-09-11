"use client";

import {
	DispatchAdminSummaryBoundary,
	DispatchDataBoundary,
} from "@/components/dispatch-admin/dispatch-admin-boundaries";
import { DispatchAdminHeader } from "@/components/dispatch-admin/dispatch-admin-header";
import { DataTable } from "@/components/tables-2/fulfillment-orders/data-table";
import { SalesDispatchSkeleton } from "@/components/tables-2/sales-dispatch/skeleton";
import type { TableSettings } from "@/utils/table-settings";

export function DispatchDashboardView({
	initialSettings,
}: {
	initialSettings?: Partial<TableSettings>;
}) {
	return (
		<div className="flex flex-col gap-4">
			<DispatchAdminSummaryBoundary showOverdueAlert />
			<DispatchAdminHeader />
			<DispatchDataBoundary
				fallback={<SalesDispatchSkeleton initialSettings={initialSettings} />}
			>
				<DataTable initialSettings={initialSettings} />
			</DispatchDataBoundary>
		</div>
	);
}
