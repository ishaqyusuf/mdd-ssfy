import { ErrorFallback } from "@/components/error-fallback";
import { GridSkeleton } from "@/components/grid-skeleton";
import { ProductReportHeader } from "@/components/product-report-header";
import { DataTable } from "@/components/tables/sales-statistics/data-table";
import { loadProductReportFilterParams } from "@/hooks/use-product-report-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { batchPrefetch, trpc } from "@/trpc/server";
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
	const filter = loadProductReportFilterParams(searchParams);

	batchPrefetch([
		(trpc.sales.getProductReport as any).infiniteQueryOptions({
			...filter,
		}),
	]);
	return (
		<PageShell>
			<PageTitle>Product Reports</PageTitle>
			<ProductReportHeader />
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<GridSkeleton />}>
					<DataTable />
				</Suspense>
			</ErrorBoundary>
		</PageShell>
	);
}
