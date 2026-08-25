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
	const { filters, setFilters } = useDispatchFilterParams();
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
				<Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
					<AlertTriangle className="text-amber-700 dark:text-amber-300" />
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
					defaultFilters={
						filters.stages?.length
							? undefined
							: {
									stages: [
										"ready_to_assign",
										"assigned",
										"packing",
										"packing_blocked",
										"ready_to_load",
										"in_transit",
									],
								}
					}
				/>
			</Suspense>
		</div>
	);
}
