import { ErrorFallback } from "@/components/error-fallback";
import { WorkerJobsList } from "@/components/jobs-dashboard/worker-jobs-list";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { workerDashboardColumns } from "@/components/tables-2/contractor-jobs/columns";
import { ContractorJobsSkeleton } from "@/components/tables-2/contractor-jobs/skeleton";
import { loadJobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { getServerAuthSession } from "@/lib/auth/session";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return constructMetadata({
        title: "Jobs List | GND",
    });
}

type Props = {
    searchParams: Promise<SearchParams>;
};

export default async function JobsDashboardJobsListPage(props: Props) {
    const [searchParams, session] = await Promise.all([
        props.searchParams,
        getServerAuthSession(),
    ]);
    const userId = Number(session?.user?.id || 0);
	const filter = {
		...loadJobFilterParams(searchParams),
		...(userId ? { userId } : {}),
	};
	const initialSettings = await getInitialTableSettings("contractor-jobs");

	batchPrefetch([
		trpc.jobs.getJobs.infiniteQueryOptions(filter, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={
								<ContractorJobsSkeleton
									columns={workerDashboardColumns}
									initialSettings={initialSettings}
								/>
							}
						>
							<WorkerJobsList
								initialSettings={initialSettings}
								userId={userId}
							/>
						</Suspense>
					</ErrorBoundary>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
