"use client";

import { DispatchAdminHeader } from "@/components/dispatch-admin/dispatch-admin-header";
import {
	DispatchAdminSummary,
	DispatchAdminSummarySkeleton,
} from "@/components/dispatch-admin/dispatch-admin-summary";
import { DataTable } from "@/components/tables-2/dispatch-backlog/data-table";
import { Suspense } from "react";

export function DispatchBacklogView() {
	return (
		<div className="flex flex-col gap-4">
			<Suspense fallback={<DispatchAdminSummarySkeleton />}>
				<DispatchAdminSummary />
			</Suspense>
			<DispatchAdminHeader />
			<DataTable />
		</div>
	);
}
