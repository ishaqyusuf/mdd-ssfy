"use client";

import { GuardedOpenJobSheet } from "@/components/guarded-open-job-sheet";
import { workerDashboardColumns } from "@/components/tables-2/contractor-jobs/columns";
import { DataTable } from "@/components/tables-2/contractor-jobs/data-table";
import { ContractorJobsSkeleton } from "@/components/tables-2/contractor-jobs/skeleton";
import { useSession } from "@/lib/auth/client";
import type { TableSettings } from "@/utils/table-settings";

type Props = {
	userId?: number;
	initialSettings?: Partial<TableSettings>;
};

export function WorkerJobsList({
	initialSettings,
	userId: initialUserId,
}: Props) {
	const { data: session, status } = useSession();
	const userId = initialUserId || Number(session?.user?.id || 0);

	if (!initialUserId && status === "loading") {
		return (
			<ContractorJobsSkeleton
				columns={workerDashboardColumns}
				initialSettings={initialSettings}
			/>
		);
	}

	return (
		<DataTable
			columns={workerDashboardColumns}
			defaultFilters={userId ? { userId } : undefined}
			emptyStateAction={<GuardedOpenJobSheet label="Submit Job" size="sm" />}
			initialSettings={initialSettings}
		/>
	);
}
