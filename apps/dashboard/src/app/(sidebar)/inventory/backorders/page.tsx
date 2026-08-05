import { ErrorFallback } from "@/components/error-fallback";
import { InventoryBackordersHeader } from "@/components/inventory/inventory-backorders-header";
import { InventoryBackordersSummary } from "@/components/inventory/inventory-backorders-summary";
import { InventoryFulfillmentSummarySkeleton } from "@/components/inventory/inventory-fulfillment-summary-skeleton";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { DataTable } from "@/components/tables-2/inventory-backorders/data-table";
import { InventoryBackordersSkeleton } from "@/components/tables-2/inventory-backorders/skeleton";
import { loadInventoryBackorderFilterParams } from "@/hooks/use-inventory-backorder-filter-params";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const filters = loadInventoryBackorderFilterParams(await props.searchParams);
	const initialSettings = await getInitialTableSettings("inventory-backorders");
	const queryInput = { ...filters, limit: 50 };

	batchPrefetch([
		trpc.inventories.salesBackorderQueue.infiniteQueryOptions(queryInput, {
			getNextPageParam: (page) => page.nextCursorId ?? undefined,
		}),
		trpc.inventories.salesBackorderQueueSummary.queryOptions(filters),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<InventoryBackordersHeader />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={<InventoryFulfillmentSummarySkeleton count={4} />}
							>
								<InventoryBackordersSummary />
							</Suspense>
						</ErrorBoundary>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<InventoryBackordersSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<DataTable initialSettings={initialSettings} />
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
