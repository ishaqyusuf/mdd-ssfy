import { ErrorFallback } from "@/components/error-fallback";
import { InventoryFulfillmentSummarySkeleton } from "@/components/inventory/inventory-fulfillment-summary-skeleton";
import { InventoryPartialShipmentsHeader } from "@/components/inventory/inventory-partial-shipments-header";
import { InventoryPartialShipmentsSummary } from "@/components/inventory/inventory-partial-shipments-summary";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { DataTable } from "@/components/tables-2/inventory-partial-shipments/data-table";
import { InventoryPartialShipmentsSkeleton } from "@/components/tables-2/inventory-partial-shipments/skeleton";
import { loadInventoryPartialShipmentFilterParams } from "@/hooks/use-inventory-partial-shipment-filter-params";
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
	const filters = loadInventoryPartialShipmentFilterParams(
		await props.searchParams,
	);
	const initialSettings = await getInitialTableSettings(
		"inventory-partial-shipments",
	);

	batchPrefetch([
		trpc.inventories.salesPartialShipmentQueue.infiniteQueryOptions(
			{ ...filters, limit: 50 },
			{
				getNextPageParam: (page) => page.nextCursorId ?? undefined,
			},
		),
		trpc.inventories.salesPartialShipmentQueueSummary.queryOptions(filters),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<InventoryPartialShipmentsHeader />
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={<InventoryFulfillmentSummarySkeleton count={5} />}
							>
								<InventoryPartialShipmentsSummary />
							</Suspense>
						</ErrorBoundary>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<InventoryPartialShipmentsSkeleton
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
