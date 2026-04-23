import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { ResolutionCenter } from "@/components/resolution-center";
import { SalesResolutionHeader } from "@/components/sales-resolution-header";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadResolutionCenterFilterParams } from "@/hooks/use-resolution-center-filter-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
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
	const queryClient = getQueryClient();
	const filter = loadResolutionCenterFilterParams(resolvedSearchParams);
	const queryOptions =
		trpc.sales.getSalesResolutions.infiniteQueryOptions(filter);
	const [initialFilterList, _initialSummary, _initialResolutionRows] =
		await Promise.all([
			queryClient.fetchQuery(trpc.filters.salesResolutions.queryOptions()),
			queryClient.fetchQuery(
				trpc.sales.getSalesResolutionsSummary.queryOptions(filter),
			),
			queryClient.fetchInfiniteQuery(queryOptions),
		]);

	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6 py-6">
					<PageTitle>{title}</PageTitle>
					<SalesResolutionHeader initialFilterList={initialFilterList} />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<TableSkeleton />}>
							<ResolutionCenter />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
