import { ErrorFallback } from "@/components/error-fallback";
import { InventoryHeader } from "@/components/inventory-header";
import { DataTable } from "@/components/tables/inventory-products/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { InventoryStockAlertWidget } from "@/components/widgets/inventory-stock-alert-widget";
import InventorySummaryWidgets from "@/components/widgets/inventory-summary-widgets";
import { loadInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
import {
	batchPrefetch,
	getQueryClient,
	HydrateClient,
	trpc,
} from "@/trpc/server";
import { RouterInputs } from "@api/trpc/routers/_app";
import type { InventorySummary } from "@sales/inventory";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

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
	const filter = {
		productKind: "inventory" as const,
		...loadInventoryFilterParams(searchParams),
	};
	batchPrefetch([
		trpc.inventories.inventoryProducts.infiniteQueryOptions({
			...filter,
		}),
		...(
			[
				"categories",
				"inventory_value",
				"stock_level",
				"total_products",
			] as InventorySummary["type"][]
		).map((type) =>
			trpc.inventories.inventorySummary.queryOptions({
				type,
			}),
		),
	]);
	return (
		<PageShell className="gap-6">
			<PageTitle>Inventory</PageTitle>
			<HydrateClient>
				<div className="flex flex-col gap-6">
					<InventorySummaryWidgets />
					<InventoryStockAlertWidget />
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
