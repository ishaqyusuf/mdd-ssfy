"use client";

import {
	DispatchAdminSummaryBoundary,
	DispatchDataBoundary,
} from "@/components/dispatch-admin/dispatch-admin-boundaries";
import { DispatchAdminHeader } from "@/components/dispatch-admin/dispatch-admin-header";
import { allDispatchStages } from "@/components/dispatch-admin/dispatch-list-presets";
import { DataTable } from "@/components/tables-2/sales-dispatch/data-table";
import { SalesDispatchSkeleton } from "@/components/tables-2/sales-dispatch/skeleton";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import type { TableSettings } from "@/utils/table-settings";

export function DispatchDashboardView({
	initialSettings,
}: {
	initialSettings?: Partial<TableSettings>;
}) {
	const { filters } = useDispatchFilterParams();
	return (
		<div className="flex flex-col gap-4">
			<DispatchAdminSummaryBoundary showOverdueAlert />
			<DispatchAdminHeader />
			<DispatchDataBoundary
				fallback={<SalesDispatchSkeleton initialSettings={initialSettings} />}
			>
				<DataTable
					workspace
					initialSettings={initialSettings}
					defaultFilters={
						filters.stages?.length
							? undefined
							: {
									stages: allDispatchStages,
								}
					}
					enableSalesMarkAs
				/>
			</DispatchDataBoundary>
		</div>
	);
}
