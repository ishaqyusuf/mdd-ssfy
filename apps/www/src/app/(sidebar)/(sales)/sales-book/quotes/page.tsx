import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { SalesQuoteHeader } from "@/components/sales-quote-header";
import { ScrollableContent } from "@/components/scrollable-content";
import { DataTable } from "@/components/tables-2/sales-quotes/data-table";
import { SalesQuotesSkeleton } from "@/components/tables-2/sales-quotes/skeleton";
import { normalizeSalesQuoteSort } from "@/components/tables-2/sales-quotes/sort";
import { loadOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { resolveSalesVisibility } from "@/lib/sales-visibility";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type SalesQuotesInput = RouterInputs["sales"]["quotes"];

export async function generateMetadata() {
	return constructMetadata({
		title: "Quotes | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const { filter } = await resolveSalesVisibility(
		loadOrderFilterParams(searchParams),
	);
	const { sort } = loadSortParams(searchParams);
	const initialSettings = await getInitialTableSettings("sales-quotes");
	const queryInput = {
		...filter,
		sort: normalizeSalesQuoteSort(sort),
	} as SalesQuotesInput;

	batchPrefetch([
		trpc.sales.quotes.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);
	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Quotes</PageTitle>
						<SalesQuoteHeader />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<SalesQuotesSkeleton initialSettings={initialSettings} />
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
