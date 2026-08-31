"use client";

import { DispatchAdminHeader } from "@/components/dispatch-admin/dispatch-admin-header";
import { DispatchCalendarSkeleton } from "@/components/dispatch-admin/dispatch-calendar-view-v2";
import { DispatchActiveView } from "@/components/dispatch-admin/views/dispatch-active-view";
import { DispatchBacklogView } from "@/components/dispatch-admin/views/dispatch-backlog-view";
import { DispatchCalendarSection } from "@/components/dispatch-admin/views/dispatch-calendar-section";
import { DispatchCompletedView } from "@/components/dispatch-admin/views/dispatch-completed-view";
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
	const showsOverview = ["dashboard", "dispatches"].includes(filters.section);
	const ownsHeader =
		showsOverview ||
		[
			"backlog",
			"active",
			"due-today",
			"past-due",
			"completed",
			"calendar",
		].includes(filters.section);
	let content: React.ReactNode;
	if (showsOverview) {
		content = <DispatchDashboardView initialSettings={initialSettings} />;
	} else if (filters.section === "backlog") {
		content = <DispatchBacklogView />;
	} else if (
		filters.section === "active" ||
		filters.section === "due-today" ||
		filters.section === "past-due"
	) {
		content = <DispatchActiveView initialSettings={initialSettings} />;
	} else if (filters.section === "completed") {
		content = <DispatchCompletedView initialSettings={initialSettings} />;
	} else if (filters.section === "calendar") {
		content = <DispatchCalendarSection />;
	} else if (filters.section === "drivers") {
		content = <DispatchDriversView />;
	} else if (filters.section === "exceptions") {
		content = <DispatchExceptionsView />;
	} else {
		content = <DataTable workspace initialSettings={initialSettings} />;
	}

	return (
		<div className="flex flex-col gap-4">
			{ownsHeader ? null : <DispatchAdminHeader />}
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense
					fallback={
						filters.section === "calendar" ? (
							<DispatchCalendarSkeleton />
						) : showsOverview ? (
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
