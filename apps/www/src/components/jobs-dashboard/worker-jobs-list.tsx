"use client";

import { GuardedOpenJobSheet } from "@/components/guarded-open-job-sheet";
import { DataTable } from "@/components/tables/contractor-jobs/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { useSession } from "@/lib/auth/client";

type Props = {
    userId?: number;
};

export function WorkerJobsList({ userId: initialUserId }: Props) {
    const { data: session, status } = useSession();
    const userId = initialUserId || Number(session?.user?.id || 0);

    if (!initialUserId && status === "loading") {
        return <TableSkeleton />;
    }

    return (
        <DataTable
            columnSet="worker"
            defaultFilters={userId ? { userId } : undefined}
            emptyStateLabel="jobs"
            CreateButton={<GuardedOpenJobSheet label="Submit Job" size="sm" />}
        />
    );
}
