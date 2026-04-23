import { ErrorFallback } from "@/components/error-fallback";
import { GridSkeleton } from "@/components/grid-skeleton";
import { ProductReportHeader } from "@/components/product-report-header";
import { DataTable } from "@/components/tables/sales-statistics/data-table";
import { loadProductReportFilterParams } from "@/hooks/use-product-report-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, getQueryClient, prefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export async function generateMetadata(props) {
	return constructMetadata({
		title: "Product Report | GND",
	});
}
export default async function Page(props) {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	const filter = loadProductReportFilterParams(searchParams);
	const initialFilterList = await queryClient.fetchQuery(
		trpc.filters.productReport.queryOptions(),
	);
	prefetch(
		trpc.sales.getProductReport.infiniteQueryOptions({
			...filter,
		}),
	);

	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Product Reports</PageTitle>
				<ProductReportHeader initialFilterList={initialFilterList} />
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<GridSkeleton />}>
						<DataTable />
					</Suspense>
				</ErrorBoundary>
			</HydrateClient>
		</PageShell>
	);
}
