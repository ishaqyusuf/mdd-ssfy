import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { QuoteHeader } from "@/components/quote-header";
import { DealershipShell } from "@/components/dealership-shell";
import { DataTable } from "@/components/tables/quotes/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadQuotesFilterParams } from "@/hooks/use-quotes-filter-params";
import { requireDealer } from "@/lib/dealer-session";
import {
	HydrateClient,
	batchPrefetch,
	getQueryClient,
	trpc,
} from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function QuotesPage(props: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const searchParams = await props.searchParams;
	const filter = loadQuotesFilterParams(searchParams);
	const { dealer } = await requireDealer();
	const queryClient = getQueryClient();
	const initialFilterList = await queryClient.fetchQuery(
		trpc.dealerPortal.quoteFilters.queryOptions(),
	);

	batchPrefetch([trpc.dealerPortal.quotes.infiniteQueryOptions(filter)]);

	return (
		<DealershipShell dealer={dealer}>
			<PageShell>
				<HydrateClient>
					<PageTitle>Quotes</PageTitle>
					<div className="flex flex-col gap-6">
						<QuoteHeader initialFilterList={initialFilterList} />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense fallback={<TableSkeleton />}>
								<DataTable />
							</Suspense>
						</ErrorBoundary>
					</div>
				</HydrateClient>
			</PageShell>
		</DealershipShell>
	);
}
