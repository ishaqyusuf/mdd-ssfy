import { CommunityProjectUnitsAnalyticsCards } from "@/components/community/project-units-analytics-cards";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ProjectUnitHeader } from "@/components/project-units-header";
import { DataTable } from "@/components/tables/project-units/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";
export const dynamic = "force-dynamic";
type ProjectUnitsInput = RouterInputs["community"]["getProjectUnits"];
type ProjectUnitsQueryInput = Exclude<ProjectUnitsInput, void>;
type ProjectUnitsOverviewInput =
	RouterInputs["community"]["communityProjectUnitsOverview"];
type ProjectUnitsOverviewQueryInput = Exclude<ProjectUnitsOverviewInput, void>;

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
	const filter = await loadProjectUnitFilterParams(searchParams);
	const { sort } = await loadSortParams(searchParams);

	return (
		<PageShell className="p-3 sm:p-4 md:p-6">
			<div className="flex flex-col gap-4 sm:gap-6">
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
	filter: Awaited<ReturnType<typeof loadProjectUnitFilterParams>>;
}) {
	const queryClient = getQueryClient();
	const overviewInput: ProjectUnitsOverviewInput = {
		builderSlug: filter.builderSlug ?? undefined,
		projectSlug: filter.projectSlug ?? undefined,
		production:
			(filter.production as ProjectUnitsOverviewQueryInput["production"]) ??
			undefined,
		installation:
			(filter.installation as ProjectUnitsOverviewQueryInput["installation"]) ??
			undefined,
	};
	await queryClient.fetchQuery(
		trpc.community.communityProjectUnitsOverview.queryOptions(overviewInput),
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
	filter: Awaited<ReturnType<typeof loadProjectUnitFilterParams>>;
	sort: Awaited<ReturnType<typeof loadSortParams>>["sort"];
}) {
	const queryClient = getQueryClient();
	const projectUnitsInput: ProjectUnitsInput = {
		...filter,
		production:
			(filter.production as ProjectUnitsQueryInput["production"]) ?? undefined,
		installation:
			(filter.installation as ProjectUnitsQueryInput["installation"]) ??
			undefined,
		sort,
	};
	await queryClient.fetchInfiniteQuery(
		trpc.community.getProjectUnits.infiniteQueryOptions(projectUnitsInput),
	);

	return (
		<HydrateClient>
			<DataTable />
		</HydrateClient>
	);
}
