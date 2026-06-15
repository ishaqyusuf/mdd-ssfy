import { ErrorFallback } from "@/components/error-fallback";
import { InventoryHeader } from "@/components/inventory-header";
import { InventoryOperationsDashboard } from "@/components/inventory/inventory-operations-dashboard";
import { DataTable } from "@/components/tables/inventory-products/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { InventoryTopSalesAnalytics } from "@/components/inventory/inventory-top-sales-analytics";
import InventorySummaryWidgets from "@/components/widgets/inventory-summary-widgets";
import { loadInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata(props) {
	return constructMetadata({
		title: "Inventories | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	const filter = {
		productKind: "inventory" as const,
		...loadInventoryFilterParams(searchParams),
	};
	await queryClient.fetchInfiniteQuery(
		trpc.inventories.inventoryProducts.infiniteQueryOptions({
			...filter,
		}) as any,
	);

	return (
		<PageShell className="gap-6">
			<PageTitle>Inventory</PageTitle>
			<HydrateClient>
				<div className="flex flex-col gap-6">
					<InventorySummaryWidgets />
					<InventoryOperationsDashboard />
					<InventoryTopSalesAnalytics />
					<InventoryHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<TableSkeleton />}>
							<DataTable defaultProductKind="inventory" />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
