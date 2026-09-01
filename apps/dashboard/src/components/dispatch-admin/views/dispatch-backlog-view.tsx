"use client";

import {
	DispatchAdminSummaryBoundary,
	DispatchDataBoundary,
} from "@/components/dispatch-admin/dispatch-admin-boundaries";
import { DispatchAdminHeader } from "@/components/dispatch-admin/dispatch-admin-header";
import { DataTable } from "@/components/tables-2/dispatch-backlog/data-table";
import { Skeleton } from "@gnd/ui/skeleton";

export function DispatchBacklogView() {
	return (
		<div className="flex flex-col gap-4">
			<DispatchAdminSummaryBoundary />
			<DispatchAdminHeader />
			<DispatchDataBoundary
				fallback={<Skeleton className="h-[480px] rounded-xl" />}
			>
				<DataTable />
			</DispatchDataBoundary>
		</div>
	);
}
