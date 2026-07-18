import { CommunityProjectUnitsAnalyticsCards } from "@/components/community/project-units-analytics-cards";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ProjectUnitHeader } from "@/components/project-units-header";
import { ScrollableContent } from "@/components/scrollable-content";
import { DataTable } from "@/components/tables-2/project-units/data-table";
import { ProjectUnitsSkeleton } from "@/components/tables-2/project-units/skeleton";
import { loadProjectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";
export const dynamic = "force-dynamic";
type ProjectUnitsInput = RouterInputs["community"]["getProjectUnits"];

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
	const initialSettings = await getInitialTableSettings("project-units");
	const queryInput: ProjectUnitsInput = {
		...filter,
		production: filter.production ?? undefined,
		installation: filter.installation ?? undefined,
		sort,
	};

	batchPrefetch([
		trpc.community.getProjectUnits.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Project Units</PageTitle>
						<ProjectUnitHeader />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense fallback={null}>
								<CommunityProjectUnitsAnalyticsCards />
							</Suspense>
						</ErrorBoundary>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<ProjectUnitsSkeleton initialSettings={initialSettings} />
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
