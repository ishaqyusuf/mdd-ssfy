"use client";

import { DispatchDataBoundary } from "@/components/dispatch-admin/dispatch-admin-boundaries";
import { DispatchAdminHeader } from "@/components/dispatch-admin/dispatch-admin-header";
import { DataTable } from "@/components/tables-2/sales-dispatch/data-table";
import { SalesDispatchSkeleton } from "@/components/tables-2/sales-dispatch/skeleton";
import type { TableSettings } from "@/utils/table-settings";

export function DispatchCompletedView({
	initialSettings,
}: {
	initialSettings?: Partial<TableSettings>;
}) {
	return (
		<div className="flex flex-col gap-4">
			<DispatchAdminHeader />
			<DispatchDataBoundary
				fallback={<SalesDispatchSkeleton initialSettings={initialSettings} />}
			>
				<DataTable workspace initialSettings={initialSettings} />
			</DispatchDataBoundary>
		</div>
	);
}
