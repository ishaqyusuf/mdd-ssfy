"use client";

import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables-2/sales-production/data-table";
import { SalesProductionSkeleton } from "@/components/tables-2/sales-production/skeleton";
import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Skeleton } from "@gnd/ui/skeleton";
import { resolveSalesProductionWorkspaceQuery } from "@sales/production-workspace-query";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

import { SalesProductionCalendar } from "./calendar";
import { SalesProductionHeader } from "./header";
import { SalesProductionReviews } from "./reviews";
import { SalesProductionSummary } from "./summary";

type SalesProductionInput = RouterInputs["sales"]["productions"];

export function SalesProductionWorkspace({
	initialTableSettings,
	defaultTableFilters,
}: {
	initialTableSettings?: Partial<TableSettings>;
	defaultTableFilters?: SalesProductionInput;
}) {
	const { filters } = useSalesProductionFilterParams();
	const { tab, view } = resolveSalesProductionWorkspaceQuery(filters);

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<SummarySkeleton />}>
					<SalesProductionSummary />
				</Suspense>
			</ErrorBoundary>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<HeaderSkeleton />}>
					<SalesProductionHeader />
				</Suspense>
			</ErrorBoundary>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense
					fallback={<ViewSkeleton initialSettings={initialTableSettings} />}
				>
					{tab === "reviews" ? (
						<SalesProductionReviews />
					) : view === "calendar" ? (
						<SalesProductionCalendar />
					) : (
						<DataTable
							initialSettings={initialTableSettings}
							defaultFilters={defaultTableFilters}
						/>
					)}
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}

function HeaderSkeleton() {
	return <Skeleton className="h-10 w-full rounded-md" />;
}

function SummarySkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
			{Array.from({ length: 4 }).map((_, index) => (
				<Skeleton key={index.toString()} className="h-[104px] rounded-xl" />
			))}
		</div>
	);
}

function ViewSkeleton({
	initialSettings,
}: {
	initialSettings?: Partial<TableSettings>;
}) {
	return (
		<SalesProductionSkeleton initialSettings={initialSettings} rowCount={8} />
	);
}
