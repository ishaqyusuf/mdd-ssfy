import { Suspense } from "react";
import type { SearchParams } from "nuqs";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/sales-dispatch/data-table";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { loadDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { AdminDispatchHeader } from "@/components/dispatch-admin/admin-dispatch-header";
import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
import {
	DispatchSummaryCards,
	DispatchSummaryCardsSkeleton,
} from "@/components/dispatch-admin/dispatch-summary-cards";
import {
	DriverWorkloadCard,
	DriverWorkloadSkeleton,
} from "@/components/dispatch-admin/driver-workload-card";
import { DispatchOverdueBanner } from "@/components/dispatch-admin/dispatch-overdue-banner";
import {
	DispatchCalendarView,
	DispatchCalendarSkeleton,
} from "@/components/dispatch-admin/dispatch-calendar-view";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Admin Dispatch Dashboard | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadDispatchFilterParams(searchParams);
	const view = filter.view ?? "table";

	batchPrefetch([
		trpc.dispatch.index.infiniteQueryOptions({
			...(filter as any),
		}),
		trpc.dispatch.dispatchSummary.queryOptions(),
	]);

	return (
		<PageShell>
			<PageTitle>Admin Dispatch Dashboard</PageTitle>
			<div className="flex flex-col gap-6">
				{/* Summary KPI Cards */}
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<DispatchSummaryCardsSkeleton />}>
							<DispatchSummaryCards />
						</Suspense>
					</ErrorBoundary>
				</div>

				{/* Overdue alert banner */}
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={null}>
						<DispatchOverdueBanner />
					</Suspense>
				</ErrorBoundary>

				{/* Header with Filters + Admin Actions */}
				<AdminDispatchHeader />

				{/* Main Content */}
				{view === "calendar" ? (
					/* Calendar View */
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<DispatchCalendarSkeleton />}>
							<DispatchCalendarView />
						</Suspense>
					</ErrorBoundary>
				) : (
					/* Table View: Table + Sidebar */
					<div className="flex gap-6 items-start">
						{/* Dispatch Table */}
						<div className="flex-1 min-w-0">
							<ErrorBoundary errorComponent={ErrorFallback}>
								<Suspense fallback={<TableSkeleton />}>
									<DataTable />
								</Suspense>
							</ErrorBoundary>
						</div>

						{/* Driver Workload Sidebar */}
						<div className="hidden xl:block w-64 shrink-0">
							<ErrorBoundary errorComponent={ErrorFallback}>
								<Suspense fallback={<DriverWorkloadSkeleton />}>
									<DriverWorkloadCard />
								</Suspense>
							</ErrorBoundary>
						</div>
					</div>
				)}
			</div>
		</PageShell>
	);
}
