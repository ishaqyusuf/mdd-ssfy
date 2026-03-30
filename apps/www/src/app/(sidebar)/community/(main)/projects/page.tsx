import { CommunityProjectHeader } from "@/components/community-project-header";
import { CommunityProjectsAnalyticsCards } from "@/components/community/project-analytics";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables/community-project/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadCommunityProjectFilterParams } from "@/hooks/use-community-project-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export async function generateMetadata() {
	return constructMetadata({
		title: "Community Projects | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadCommunityProjectFilterParams(searchParams);

	batchPrefetch([
		trpc.community.getCommunityProjects.infiniteQueryOptions({
			...filter,
		}),
		trpc.community.communityProjectsOverview.queryOptions({
			builderId: filter.builderId ?? undefined,
			refNo: (filter as any).refNo ?? undefined,
			status: (filter as any).status ?? undefined,
		}),
	]);

	return (
		<PageShell>
			<PageTitle>Projects</PageTitle>
			<HydrateClient>
				<div className="flex flex-col gap-6">
					<CommunityProjectHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<TableSkeleton />}>
							<CommunityProjectsAnalyticsCards />
						</Suspense>
					</ErrorBoundary>
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<TableSkeleton />}>
							<DataTable />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
