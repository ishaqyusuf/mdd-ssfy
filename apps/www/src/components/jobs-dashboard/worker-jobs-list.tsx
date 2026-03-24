"use client";

import { OpenJobSheet } from "@/components/open-contractor-jobs-sheet";
import { DataTable } from "@/components/tables/contractor-jobs/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { useSession } from "next-auth/react";

export function WorkerJobsList() {
	const { data: session, status } = useSession();
	const userId = Number(session?.user?.id || 0);

	if (status === "loading") {
		return <TableSkeleton />;
	}

	return (
		<DataTable
			columnSet="worker"
			defaultFilters={userId ? { userId } : undefined}
			emptyStateLabel="jobs"
			CreateButton={<OpenJobSheet label="Submit Job" size="sm" />}
		/>
	);
}
