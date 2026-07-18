import { ErrorFallback } from "@/components/error-fallback";
import { InventorySuppliersPage } from "@/components/inventory/inventory-suppliers-page";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { InventorySuppliersSkeleton } from "@/components/tables-2/inventory-suppliers/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function Page() {
	const initialSettings = await getInitialTableSettings("inventory-suppliers");

	batchPrefetch([
		trpc.inventories.inventorySuppliers.queryOptions({
			q: null,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Suppliers</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<InventorySuppliersSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<InventorySuppliersPage initialSettings={initialSettings} />
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
