import { JobHeader } from "@/components/contractor-jobs-header";
import { ErrorFallback } from "@/components/error-fallback";
import { ScrollableContent } from "@/components/scrollable-content";
import { DataTable } from "@/components/tables-2/contractor-jobs/data-table";
import { ContractorJobsSkeleton } from "@/components/tables-2/contractor-jobs/skeleton";
import { JobsKpiWidget } from "@/components/widgets/jobs-kpi-widget";
import { loadJobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

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
	const initialSettings = await getInitialTableSettings("contractor-jobs");

	batchPrefetch([
		trpc.jobs.getJobs.infiniteQueryOptions(
			{
				...filter,
			},
			{
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			},
		),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Job</PageTitle>
						<JobHeader />
						<JobsKpiWidget />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<ContractorJobsSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<DataTable initialSettings={initialSettings} />
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
