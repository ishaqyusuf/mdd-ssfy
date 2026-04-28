import { ErrorFallbackSales } from "@/components/error-fallback-sales";
import { OrderHeader } from "@/components/sales-order-header";
import { DataTable } from "@/components/tables/sales-orders/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { resolveSalesVisibility } from "@/lib/sales-visibility";
import { batchPrefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";
export async function generateMetadata(props) {
	return constructMetadata({
		title: "Sales Bin | GND",
	});
}

export default async function Page(props) {
	const searchParams = await props.searchParams;
	const { filter } = await resolveSalesVisibility(
		loadOrderFilterParams(searchParams),
	);
	batchPrefetch([
		trpc.sales.getOrders.infiniteQueryOptions({
			...(filter as any),
			bin: true,
		}),
	]);
	return (
		<PageShell>
			<PageTitle>Sales Bin</PageTitle>
			<OrderHeader />
			<ErrorBoundary errorComponent={ErrorFallbackSales}>
				<Suspense fallback={<TableSkeleton />}>
					<DataTable bin />
				</Suspense>
			</ErrorBoundary>
		</PageShell>
	);
}
