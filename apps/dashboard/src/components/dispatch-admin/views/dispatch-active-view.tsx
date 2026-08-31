"use client";

import { DispatchAdminHeader } from "@/components/dispatch-admin/dispatch-admin-header";
import { DataTable } from "@/components/tables-2/sales-dispatch/data-table";
import { SalesDispatchSkeleton } from "@/components/tables-2/sales-dispatch/skeleton";
import type { TableSettings } from "@/utils/table-settings";
import { Suspense } from "react";

export function DispatchActiveView({
	initialSettings,
}: {
	initialSettings?: Partial<TableSettings>;
}) {
	return (
		<div className="flex flex-col gap-4">
			<DispatchAdminHeader />
			<Suspense
				fallback={<SalesDispatchSkeleton initialSettings={initialSettings} />}
			>
				<DataTable
					workspace
					initialSettings={initialSettings}
					enableSalesMarkAs
				/>
			</Suspense>
		</div>
	);
}
