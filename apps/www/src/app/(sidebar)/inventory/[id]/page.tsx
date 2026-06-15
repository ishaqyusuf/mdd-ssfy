import { ErrorFallback } from "@/components/error-fallback";
import { InventoryItemDashboardPage } from "@/components/inventory/inventory-item-dashboard-page";
import PageShell from "@/components/page-shell";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";
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
	const queryClient = getQueryClient();

	if (Number.isFinite(inventoryId) && inventoryId > 0) {
		await queryClient.fetchQuery(
			trpc.inventories.inventoryItemDashboard.queryOptions({
				inventoryId,
			}),
		);
	}

	return (
		<PageShell className="gap-6">
			<PageTitle>Inventory Item</PageTitle>
			<HydrateClient>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<InventoryItemDashboardPage inventoryId={inventoryId} />
					</Suspense>
				</ErrorBoundary>
			</HydrateClient>
		</PageShell>
	);
}
