import { ErrorFallback } from "@/components/error-fallback";
import { CommunityProjectUnitsAnalyticsCards } from "@/components/community/project-units-analytics-cards";
import { ProjectUnitHeader } from "@/components/project-units-header";
import { DataTable } from "@/components/tables/project-units/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata(props) {
	return constructMetadata({
		title: "Project Units | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadProjectUnitFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);

	return (
		<PageShell>
			<div className="flex flex-col gap-6">
				<PageTitle>Project Unit</PageTitle>
				<ProjectUnitHeader />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<PrefetchedProjectUnitsAnalytics filter={filter} />
					</Suspense>
				</ErrorBoundary>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<PrefetchedProjectUnitsTable filter={filter} sort={sort} />
					</Suspense>
				</ErrorBoundary>
			</div>
		</PageShell>
	);
}

async function PrefetchedProjectUnitsAnalytics({
	filter,
}: {
	filter: ReturnType<typeof loadProjectUnitFilterParams>;
}) {
	const queryClient = getQueryClient();
	await queryClient.fetchQuery(
		trpc.community.communityProjectUnitsOverview.queryOptions({
			builderSlug: filter.builderSlug ?? undefined,
			projectSlug: filter.projectSlug ?? undefined,
			production: (filter as any).production ?? undefined,
			installation: (filter as any).installation ?? undefined,
		}),
	);

	return (
		<HydrateClient>
			<CommunityProjectUnitsAnalyticsCards />
		</HydrateClient>
	);
}

async function PrefetchedProjectUnitsTable({
	filter,
	sort,
}: {
	filter: ReturnType<typeof loadProjectUnitFilterParams>;
	sort: ReturnType<typeof loadSortParams>["sort"];
}) {
	const queryClient = getQueryClient();
	await queryClient.fetchInfiniteQuery(
		trpc.community.getProjectUnits.infiniteQueryOptions({
			...(filter as any),
			sort,
		}) as any,
	);

	return (
		<HydrateClient>
			<DataTable />
		</HydrateClient>
	);
}
