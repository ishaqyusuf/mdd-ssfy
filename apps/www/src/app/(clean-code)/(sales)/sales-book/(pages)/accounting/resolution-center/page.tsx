import { ErrorFallback } from "@/components/error-fallback";
import { ResolutionCenter } from "@/components/resolution-center";
import { SalesResolutionHeader } from "@/components/sales-resolution-header";
import { _perm, _role } from "@/components/sidebar/links";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadResolutionCenterFilterParams } from "@/hooks/use-resolution-center-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { searchParamsCache } from "./search-params";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";
export async function generateMetadata({}) {
	return constructMetadata({
		title: `Payment Resolution - gndprodesk.com`,
	});
}
export default async function Page({ searchParams }) {
	const resolvedSearchParams = await searchParams;
	const queryClient = getQueryClient();
	const filter = loadResolutionCenterFilterParams(resolvedSearchParams);
	const [initialFilterList, _initialResolutionRows] = await Promise.all([
		queryClient.fetchQuery(trpc.filters.salesResolutions.queryOptions()),
		queryClient.fetchInfiniteQuery(
			trpc.sales.getSalesResolutions.infiniteQueryOptions({
				...(filter as any),
			}) as any,
		),
	]);
	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Resolution Center</PageTitle>
				<div className="flex flex-col gap-6">
					<SalesResolutionHeader initialFilterList={initialFilterList as any} />
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
