import { ErrorFallback } from "@/components/error-fallback";
import { SalesAccountingHeader } from "@/components/sales-accounting-header";
import { DataTable } from "@/components/tables/sales-accounting/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadSalesAccountingFilterParams } from "@/hooks/use-sales-accounting-filter-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
export async function generateMetadata(props) {
	return constructMetadata({
		title: "Sales Accounting | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	const filter = loadSalesAccountingFilterParams(searchParams);
	const [initialFilterList, _initialAccountingRows] = await Promise.all([
		queryClient.fetchQuery(trpc.filters.salesAccounting.queryOptions()),
		queryClient.fetchInfiniteQuery(
			trpc.sales.getSalesAccountings.infiniteQueryOptions({
				...(filter as any),
			}) as any,
		),
	]);
	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6 py-6">
					<PageTitle>Sales Accounting</PageTitle>
					<SalesAccountingHeader initialFilterList={initialFilterList as any} />
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
