import { getSessionPermissions } from "@/app-deps/(v1)/_actions/utils";
import { ErrorFallback } from "@/components/error-fallback";
import { SalesQuoteHeader } from "@/components/sales-quote-header";
import { DataTable } from "@/components/tables/sales-quotes/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, prefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export const dynamic = "force-dynamic";

export async function generateMetadata(props) {
	return constructMetadata({
		title: "Quotes | GND",
	});
}

export default async function Page(props) {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	const filter = loadOrderFilterParams(searchParams);
	const permissions = await getSessionPermissions();
	const salesManager = !!permissions?.viewSalesManager;
	const initialFilterList = await queryClient.fetchQuery(
		trpc.filters.salesQuotes.queryOptions({
			salesManager,
		}),
	);
	prefetch(
		trpc.sales.quotes.infiniteQueryOptions({
			...filter,
		}),
	);
	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Quotes</PageTitle>
				<div className="flex flex-col gap-6">
					<SalesQuoteHeader initialFilterList={initialFilterList} />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<TableSkeleton />}>
							<DataTable />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
