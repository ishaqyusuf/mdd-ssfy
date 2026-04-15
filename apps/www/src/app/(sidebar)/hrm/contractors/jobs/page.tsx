import { JobHeader } from "@/components/contractor-jobs-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/contractor-jobs/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { JobsKpiWidget } from "@/components/widgets/jobs-kpi-widget";
import { loadJobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
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
	const queryClient = getQueryClient();
	const filter = loadJobFilterParams(searchParams);
	const [initialFilterList, _initialJobs, _initialKpis] = await Promise.all([
		queryClient.fetchQuery(trpc.filters.job.queryOptions()),
		queryClient.fetchInfiniteQuery(
			trpc.jobs.getJobs.infiniteQueryOptions({
				...filter,
			}) as any,
		),
		queryClient.fetchQuery(trpc.jobs.getKpis.queryOptions({})),
	]);
	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6 pt-6">
					<PageTitle>Job</PageTitle>
					<JobsKpiWidget />
					<JobHeader initialFilterList={initialFilterList as any} />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<TableSkeleton />}>
							<DataTable columnSet="admin" />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
