import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { SiteActionsColumnVisibility } from "@/components/tables-2/site-actions/column-visibility";
import { DataTable } from "@/components/tables-2/site-actions/data-table";
import { SiteActionsSkeleton } from "@/components/tables-2/site-actions/skeleton";
import { loadingSiteActionFilterParams } from "@/hooks/use-site-action-filter-params";
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

export async function generateMetadata() {
	return constructMetadata({
		title: "Site Actions | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadingSiteActionFilterParams(searchParams);
	const { sort } = loadSortParams(searchParams);
	const initialSettings = await getInitialTableSettings("site-actions");
	const queryInput = {
		...filter,
		sort,
	} as RouterInputs["siteActions"]["index"];

	batchPrefetch([
		trpc.siteActions.index.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<div className="flex items-center justify-between gap-3">
							<PageTitle>Site Actions</PageTitle>
							<SiteActionsColumnVisibility />
						</div>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<SiteActionsSkeleton initialSettings={initialSettings} />
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
