import { ErrorFallback } from "@/components/error-fallback";
import { InventoryItemDashboardPage } from "@/components/inventory/inventory-item-dashboard-page";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { INVENTORY_ITEM_DASHBOARD_TABLE_IDS } from "@/components/tables-2/inventory-item-dashboard/types";
import { InventoryProductsSkeleton } from "@/components/tables-2/inventory-products/skeleton";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
	return constructMetadata({
		title: "Inventory Item | GND",
	});
}

type Props = {
	params: Promise<{
		id: string;
	}>;
};

export default async function Page(props: Props) {
	const params = await props.params;
	const inventoryId = Number(params.id);
	const tableSettings = await Promise.all(
		INVENTORY_ITEM_DASHBOARD_TABLE_IDS.map(async (tableId) => [
			tableId,
			await getInitialTableSettings(tableId),
		]),
	);
	const initialSettings = Object.fromEntries(tableSettings);

	if (Number.isFinite(inventoryId) && inventoryId > 0) {
		batchPrefetch([
			trpc.inventories.inventoryItemDashboard.queryOptions({
				inventoryId,
			}),
		]);
	}

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Inventory Item</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense fallback={<InventoryProductsSkeleton />}>
								<InventoryItemDashboardPage
									inventoryId={inventoryId}
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
