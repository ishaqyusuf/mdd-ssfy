import { ErrorFallback } from "@/components/error-fallback";
import { InventoryBackorderQueuePage } from "@/components/inventory/inventory-backorder-queue-page";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { InventoryBackordersSkeleton } from "@/components/tables-2/inventory-backorders/skeleton";
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
	const initialSettings = await getInitialTableSettings("inventory-backorders");
	const queryInput = {
		limit: 100,
		statuses: null,
	};

	batchPrefetch([
		trpc.inventories.salesBackorderQueue.queryOptions(queryInput),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Inventory Backorders</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<InventoryBackordersSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<InventoryBackorderQueuePage
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
