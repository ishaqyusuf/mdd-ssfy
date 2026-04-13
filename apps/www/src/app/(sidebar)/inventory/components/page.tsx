import { ErrorFallback } from "@/components/error-fallback";
import { InventoryHeader } from "@/components/inventory-header";
import { DataTable } from "@/components/tables/inventory-products/data-table";
import { TableSkeleton } from "@/components/tables/skeleton";
import { loadInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import type { InventorySummary } from "@sales/inventory";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export async function generateMetadata() {
	return constructMetadata({
		title: "Components | GND",
	});
}

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = {
		productKind: "component" as const,
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
		<PageShell>
			<PageTitle>Components</PageTitle>
			<HydrateClient>
				<div className="flex flex-col gap-6">
					<InventoryHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<TableSkeleton />}>
							<DataTable defaultProductKind="component" />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
