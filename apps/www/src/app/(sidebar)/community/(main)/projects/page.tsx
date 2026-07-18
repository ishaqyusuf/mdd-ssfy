import { CommunityProjectHeader } from "@/components/community-project-header";
import { CommunityProjectsAnalyticsCards } from "@/components/community/project-analytics";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { DataTable } from "@/components/tables-2/community-projects/data-table";
import { CommunityProjectsSkeleton } from "@/components/tables-2/community-projects/skeleton";
import { loadCommunityProjectFilterParams } from "@/hooks/use-community-project-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

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
	const initialSettings = await getInitialTableSettings("community-projects");

	batchPrefetch([
		trpc.community.getCommunityProjects.infiniteQueryOptions(
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
						<PageTitle>Projects</PageTitle>
						<CommunityProjectHeader />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense fallback={null}>
								<CommunityProjectsAnalyticsCards />
							</Suspense>
						</ErrorBoundary>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<CommunityProjectsSkeleton
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
