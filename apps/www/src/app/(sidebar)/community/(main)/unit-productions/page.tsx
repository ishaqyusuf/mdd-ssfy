import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { DataTable } from "@/components/tables-2/unit-productions/data-table";
import { UnitProductionsSkeleton } from "@/components/tables-2/unit-productions/skeleton";
import { UnitProductionSummaryWidgets } from "@/components/unit-production-summary-widgets";
import { UnitProductionsHeader } from "@/components/unit-productions-header";
import { loadSortParams } from "@/hooks/use-sort-params";
import { loadUnitProductionFilterParams } from "@/hooks/use-unit-productions-filter-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Unit Productions | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function CommunityProductionsPage(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadUnitProductionFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);
	const initialSettings = await getInitialTableSettings("unit-productions");
	const queryInput = {
		...filter,
		sort,
	} as unknown as RouterInputs["community"]["getUnitProductions"];

	batchPrefetch([
		trpc.community.getUnitProductions.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Unit Productions</PageTitle>
						<UnitProductionsHeader />
						<UnitProductionSummaryWidgets />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<UnitProductionsSkeleton initialSettings={initialSettings} />
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
