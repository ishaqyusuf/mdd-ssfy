"use client";

import {
	DispatchAdminSummary,
	DispatchAdminSummarySkeleton,
} from "@/components/dispatch-admin/dispatch-admin-summary";
import { DataTable } from "@/components/tables-2/sales-dispatch/data-table";
import { SalesDispatchSkeleton } from "@/components/tables-2/sales-dispatch/skeleton";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Suspense } from "react";

export function DispatchDashboardView({
	initialSettings,
}: {
	initialSettings?: Partial<TableSettings>;
}) {
	const trpc = useTRPC();
	const { setFilters } = useDispatchFilterParams();
	const { data } = useSuspenseQuery(
		trpc.dispatch.workspaceSummary.queryOptions(undefined, {
			staleTime: 30_000,
		}),
	);
	return (
		<div className="flex flex-col gap-4">
			<Suspense fallback={<DispatchAdminSummarySkeleton />}>
				<DispatchAdminSummary />
			</Suspense>
			{data.overdue > 0 ? (
				<Alert>
					<AlertTriangle />
					<AlertTitle>{data.overdue} overdue dispatches</AlertTitle>
					<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
						<span>
							Review schedules or resolve the blockers holding these trips.
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setFilters({
									section: "dispatches",
									risks: ["overdue"],
								})
							}
						>
							Review overdue
						</Button>
					</AlertDescription>
				</Alert>
			) : null}
			<Suspense
				fallback={<SalesDispatchSkeleton initialSettings={initialSettings} />}
			>
				<DataTable
					workspace
					initialSettings={initialSettings}
					defaultFilters={{
						stages: [
							"ready_to_assign",
							"assigned",
							"packing",
							"packing_blocked",
							"ready_to_load",
							"in_transit",
						],
					}}
				/>
			</Suspense>
		</div>
	);
}
