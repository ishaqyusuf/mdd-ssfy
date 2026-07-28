import { ErrorFallback } from "@/components/error-fallback";
import { InventoryHeader } from "@/components/inventory-header";
import { InventoryOperationsDashboard } from "@/components/inventory/inventory-operations-dashboard";
import { InventoryTopSalesAnalytics } from "@/components/inventory/inventory-top-sales-analytics";
import { InventoryValidationFixturePanel } from "@/components/inventory/inventory-validation-fixture-panel";
import PageShell from "@/components/page-shell";
import { DataTable } from "@/components/tables-2/inventory-products/data-table";
import { InventoryProductsSkeleton } from "@/components/tables-2/inventory-products/skeleton";
import InventorySummaryWidgets from "@/components/widgets/inventory-summary-widgets";
import { loadInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { PageTitle } from "@gnd/ui/custom/page-title";
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
type InventoryProductsInput = RouterInputs["inventories"]["inventoryProducts"];

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadInventoryFilterParams(searchParams);
	const initialSettings = await getInitialTableSettings("inventory-products");
	const queryInput = {
		...filter,
		productKind: filter.productKind ?? "inventory",
		showCustom: filter.showCustom ?? false,
	} as InventoryProductsInput;

	batchPrefetch([
		trpc.inventories.inventoryProducts.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell className="gap-6">
			<PageTitle>Inventory</PageTitle>
			<HydrateClient>
				<div className="flex flex-col gap-6">
					<InventorySummaryWidgets />
					<InventoryOperationsDashboard />
					<InventoryValidationFixturePanel />
					<InventoryTopSalesAnalytics />
					<InventoryHeader defaultProductKind="inventory" />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={
								<InventoryProductsSkeleton initialSettings={initialSettings} />
							}
						>
							<DataTable
								defaultProductKind="inventory"
								initialSettings={initialSettings}
							/>
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
