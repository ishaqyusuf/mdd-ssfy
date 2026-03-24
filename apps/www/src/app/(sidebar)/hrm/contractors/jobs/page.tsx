import { JobHeader } from "@/components/contractor-jobs-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/contractor-jobs/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { JobsKpiWidget } from "@/components/widgets/jobs-kpi-widget";
import { loadJobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export async function generateMetadata(props) {
	return constructMetadata({
		title: "Job | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadJobFilterParams(searchParams);
	batchPrefetch([
		trpc.jobs.getJobs.infiniteQueryOptions({
			...filter,
		}),
		trpc.jobs.getKpis.infiniteQueryOptions({
			...filter,
		}),
	]);
	return (
		<div className="flex flex-col gap-6 pt-6">
			<PageTitle>Job</PageTitle>
			<JobsKpiWidget />
			<JobHeader />
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<TableSkeleton />}>
					<DataTable columnSet="admin" />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
