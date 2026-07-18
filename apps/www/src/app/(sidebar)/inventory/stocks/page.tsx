import { ErrorFallback } from "@/components/error-fallback";
import { InventoryStockOperationsPage } from "@/components/inventory/inventory-stock-operations-page";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { InventoryStockAuditSkeleton } from "@/components/tables-2/inventory-stock-audit/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function InventoryStocksPage() {
	const initialSettings = await getInitialTableSettings(
		"inventory-stock-audit",
	);

	batchPrefetch([
		trpc.inventories.stockAuditVerificationReport.queryOptions(undefined),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Inventory Stock Operations</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<InventoryStockAuditSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<InventoryStockOperationsPage
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
