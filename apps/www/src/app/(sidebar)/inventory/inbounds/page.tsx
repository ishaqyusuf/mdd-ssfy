import { ErrorFallback } from "@/components/error-fallback";
import { InboundReceivingPage } from "@/components/inventory/inbound-receiving-page";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { InventoryInboundsSkeleton } from "@/components/tables-2/inventory-inbounds/skeleton";
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
	const initialSettings = await getInitialTableSettings("inventory-inbounds");

	batchPrefetch([
		trpc.inventories.inboundSuppliers.queryOptions(),
		trpc.inventories.inboundShipments.queryOptions({}),
		trpc.inventories.inboundDemandQueue.queryOptions({}),
		trpc.inventories.supplierReorderSuggestions.queryOptions(),
		trpc.inventories.inboundStatusDemandReconciliation.queryOptions({
			take: 50,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Inventory Inbounds</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<InventoryInboundsSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<InboundReceivingPage initialSettings={initialSettings} />
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
