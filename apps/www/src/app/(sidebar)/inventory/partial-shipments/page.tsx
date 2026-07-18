import { ErrorFallback } from "@/components/error-fallback";
import { InventoryPartialShipmentPage } from "@/components/inventory/inventory-partial-shipment-page";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { InventoryPartialShipmentsSkeleton } from "@/components/tables-2/inventory-partial-shipments/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	await props.searchParams;
	const initialSettings = await getInitialTableSettings(
		"inventory-partial-shipments",
	);

	batchPrefetch([
		trpc.inventories.salesPartialShipmentQueue.queryOptions({
			limit: 100,
			statuses: null,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Inventory Partial Shipments</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<InventoryPartialShipmentsSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<InventoryPartialShipmentPage
									initialSettings={initialSettings}
								/>
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
