import { DealershipShell } from "@/components/dealership-shell";
import { ErrorFallback } from "@/components/error-fallback";
import { OrderHeader } from "@/components/order-header";
import PageShell from "@/components/page-shell";
import { DataTable } from "@/components/tables/orders/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadOrdersFilterParams } from "@/hooks/use-orders-filter-params";
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

export default async function OrdersPage(props: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const searchParams = await props.searchParams;
	const filter = loadOrdersFilterParams(searchParams);
	const { dealer } = await requireDealer();
	const queryClient = getQueryClient();
	const initialFilterList = await queryClient.fetchQuery(
		trpc.dealerPortal.orderFilters.queryOptions(),
	);

	batchPrefetch([
		trpc.dealerPortal.dashboard.queryOptions(),
		trpc.dealerPortal.orders.infiniteQueryOptions(filter),
	]);

	return (
		<DealershipShell dealer={dealer}>
			<PageShell>
				<HydrateClient>
					<PageTitle>Orders</PageTitle>
					<div className="flex flex-col gap-6">
						<OrderHeader initialFilterList={initialFilterList} />
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
