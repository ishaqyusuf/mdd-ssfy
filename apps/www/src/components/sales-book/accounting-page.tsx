import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { SalesAccountingHeader } from "@/components/sales-accounting-header";
import { DataTable } from "@/components/tables/sales-accounting/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadSalesAccountingFilterParams } from "@/hooks/use-sales-accounting-filter-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

type Props = {
	searchParams: Promise<SearchParams>;
	title?: string;
};

export async function SalesBookAccountingPage({
	searchParams,
	title = "Sales Accounting",
}: Props) {
	const resolvedSearchParams = await searchParams;
	const queryClient = getQueryClient();
	const filter = loadSalesAccountingFilterParams(resolvedSearchParams);
	const queryOptions =
		trpc.sales.getSalesAccountings.infiniteQueryOptions(filter);

	await queryClient.fetchInfiniteQuery(queryOptions);

	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6 py-6">
					<PageTitle>{title}</PageTitle>
					<SalesAccountingHeader />
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
