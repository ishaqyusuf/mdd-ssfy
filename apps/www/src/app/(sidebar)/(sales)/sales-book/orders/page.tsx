import { ErrorFallbackSales } from "@/components/error-fallback-sales";
import { OrderHeader } from "@/components/sales-order-header";
import { DataTable } from "@/components/tables/sales-orders/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { batchPrefetch, trpc } from "@/trpc/server";
import { db } from "@gnd/db";
import { consoleLog } from "@gnd/utils";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
export async function generateMetadata(props) {
	return constructMetadata({
		title: "Sales | GND",
	});
}

export default async function Page(props) {
	const searchParams = await props.searchParams;

	const filter = loadOrderFilterParams(searchParams);
	batchPrefetch([
		trpc.sales.getOrders.infiniteQueryOptions({
			...(filter as any),
		}),
	]);
	return (
		<PageShell>
			<PageTitle>Sales</PageTitle>
			<OrderHeader />
			<ErrorBoundary errorComponent={ErrorFallbackSales}>
				<Suspense fallback={<TableSkeleton />}>
					<DataTable />
				</Suspense>
			</ErrorBoundary>
		</PageShell>
	);
}
