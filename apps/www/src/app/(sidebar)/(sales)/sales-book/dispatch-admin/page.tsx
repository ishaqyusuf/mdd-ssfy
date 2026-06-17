import { AuthGuard } from "@/components/auth-guard";
import { AdminDispatchHeader } from "@/components/dispatch-admin/admin-dispatch-header";
import {
	DispatchCalendarSkeleton,
	DispatchCalendarView,
} from "@/components/dispatch-admin/dispatch-calendar-view";
import { DispatchOverdueBanner } from "@/components/dispatch-admin/dispatch-overdue-banner";
import {
	DispatchSummaryCards,
	DispatchSummaryCardsSkeleton,
} from "@/components/dispatch-admin/dispatch-summary-cards";
import {
	DriverWorkloadCard,
	DriverWorkloadSkeleton,
} from "@/components/dispatch-admin/driver-workload-card";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { _perm } from "@/components/sidebar-links";
import { DataTable } from "@/components/tables-2/sales-dispatch/data-table";
import { SalesDispatchSkeleton } from "@/components/tables-2/sales-dispatch/skeleton";
import { loadDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Admin Dispatch Dashboard | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};
type DispatchInput = RouterInputs["dispatch"]["index"];
type ExportDispatchesInput = RouterInputs["dispatch"]["exportDispatches"];

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadDispatchFilterParams(searchParams);
	const view = filter.view ?? "table";
	const { view: _view, ...dispatchFilter } = filter;
	const { sort } = loadSortParams(searchParams);
	const initialSettings = await getInitialTableSettings("sales-dispatch");
	const queryInput = {
		...dispatchFilter,
		sort,
	} as DispatchInput;

	if (view === "calendar") {
		batchPrefetch([
			trpc.dispatch.exportDispatches.queryOptions(
				dispatchFilter as ExportDispatchesInput,
			),
		]);
	} else {
		batchPrefetch([
			trpc.dispatch.index.infiniteQueryOptions(queryInput, {
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			}),
			trpc.hrm.getEmployees.queryOptions({
				can: ["viewDelivery"],
				cannot: ["editOrders"],
			}),
		]);
	}

	return (
		<PageShell>
			<HydrateClient>
				<AuthGuard
					rules={[_perm.some("editOrders", "editDelivery")]}
					Fallback={
						<div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
							You do not have permission to access dispatch admin.
						</div>
					}
				>
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
										<Suspense
											fallback={
												<SalesDispatchSkeleton
													initialSettings={initialSettings}
												/>
											}
										>
											<DataTable initialSettings={initialSettings} />
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
				</AuthGuard>
			</HydrateClient>
		</PageShell>
	);
}
