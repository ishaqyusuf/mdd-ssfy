"use client";

import { DispatchAdminHeader } from "@/components/dispatch-admin/dispatch-admin-header";
import {
	DispatchCalendarSkeleton,
	DispatchCalendarView,
} from "@/components/dispatch-admin/dispatch-calendar-view-v2";
import { DispatchBacklogView } from "@/components/dispatch-admin/views/dispatch-backlog-view";
import { DispatchDashboardView } from "@/components/dispatch-admin/views/dispatch-dashboard-view";
import { DispatchDriversView } from "@/components/dispatch-admin/views/dispatch-drivers-view";
import { DispatchExceptionsView } from "@/components/dispatch-admin/views/dispatch-exceptions-view";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables-2/sales-dispatch/data-table";
import { SalesDispatchSkeleton } from "@/components/tables-2/sales-dispatch/skeleton";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import type { TableSettings } from "@/utils/table-settings";
import { Skeleton } from "@gnd/ui/skeleton";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export function DispatchAdminWorkspaceClient({
	initialSettings,
}: {
	initialSettings?: Partial<TableSettings>;
}) {
	const { filters } = useDispatchFilterParams();
	let content: React.ReactNode;
	if (filters.section === "dashboard") {
		content = <DispatchDashboardView initialSettings={initialSettings} />;
	} else if (filters.section === "backlog") {
		content = <DispatchBacklogView />;
	} else if (filters.section === "calendar") {
		content = <DispatchCalendarView />;
	} else if (filters.section === "drivers") {
		content = <DispatchDriversView />;
	} else if (filters.section === "exceptions") {
		content = <DispatchExceptionsView />;
	} else {
		content = <DataTable workspace initialSettings={initialSettings} />;
	}

	return (
		<div className="flex flex-col gap-4">
			<DispatchAdminHeader />
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense
					fallback={
						filters.section === "calendar" ? (
							<DispatchCalendarSkeleton />
						) : filters.section === "dispatches" ? (
							<SalesDispatchSkeleton initialSettings={initialSettings} />
						) : (
							<Skeleton className="h-[480px] rounded-xl" />
						)
					}
				>
					{content}
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
