import { getSessionPermissions } from "@/app-deps/(v1)/_actions/utils";
import { ErrorFallbackSales } from "@/components/error-fallback-sales";
import { OrderHeader } from "@/components/sales-order-header";
import { DataTable } from "@/components/tables/sales-orders/data-table";
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
		title: "Sales | GND",
	});
}

export default async function Page(props) {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	const filter = loadOrderFilterParams(searchParams);
	const permissions = await getSessionPermissions();
	const salesManager = !!permissions?.viewSalesManager;
	const initialFilterList = await queryClient.fetchQuery(
		trpc.filters.salesOrders.queryOptions({
			salesManager,
		}),
	);
	prefetch(
		trpc.sales.getOrders.infiniteQueryOptions({
			...filter,
		}),
	);
	return (
		<PageShell>
			<HydrateClient>
				<PageTitle>Sales</PageTitle>
				<OrderHeader initialFilterList={initialFilterList} />
				<ErrorBoundary errorComponent={ErrorFallbackSales}>
					<Suspense fallback={<TableSkeleton />}>
						<DataTable />
					</Suspense>
				</ErrorBoundary>
			</HydrateClient>
		</PageShell>
	);
}
