import { CategoryHeader } from "@/components/category-header";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { DataTable } from "@/components/tables-2/inventory-categories/data-table";
import { InventoryCategoriesSkeleton } from "@/components/tables-2/inventory-categories/skeleton";
import { loadInventoryFilterParams } from "@/hooks/use-inventory-filter-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { InventoryCategories } from "@gnd/inventory/schema";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type Props = {
	searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const filter = loadInventoryFilterParams(searchParams);
	const initialSettings = await getInitialTableSettings("inventory-categories");
	const queryInput = {
		q: filter.q,
		productKind: filter.productKind ?? "inventory",
	} as InventoryCategories;

	batchPrefetch([
		trpc.inventories.inventoryCategories.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<PageTitle>Category</PageTitle>
			<HydrateClient>
				<div className="flex flex-col gap-6">
					<CategoryHeader />
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense
							fallback={
								<InventoryCategoriesSkeleton
									initialSettings={initialSettings}
								/>
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
