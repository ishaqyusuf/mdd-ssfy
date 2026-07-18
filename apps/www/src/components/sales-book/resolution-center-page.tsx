import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { SalesResolutionHeader } from "@/components/sales-resolution-header";
import { ScrollableContent } from "@/components/scrollable-content";
import { DataTable } from "@/components/tables-2/sales-resolution/data-table";
import { SalesResolutionSkeleton } from "@/components/tables-2/sales-resolution/skeleton";
import { loadResolutionCenterFilterParams } from "@/hooks/use-resolution-center-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

type Props = {
	searchParams: Promise<SearchParams>;
	title?: string;
};

export async function SalesResolutionCenterPage({
	searchParams,
	title = "Resolution Center",
}: Props) {
	const resolvedSearchParams = await searchParams;
	const filter = loadResolutionCenterFilterParams(resolvedSearchParams);
	const { sort } = loadSortParams(resolvedSearchParams);
	const initialSettings = await getInitialTableSettings("sales-resolution");
	const queryInput = {
		...filter,
		sort: sort?.[0] ?? null,
	} as RouterInputs["sales"]["getSalesResolutions"];

	batchPrefetch([
		trpc.filters.salesResolutions.queryOptions(),
		trpc.sales.getSalesResolutionsSummary.queryOptions(queryInput),
		trpc.sales.getSalesResolutions.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex min-w-0 flex-col gap-6">
						<PageTitle>{title}</PageTitle>
						<SalesResolutionHeader />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<SalesResolutionSkeleton initialSettings={initialSettings} />
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
