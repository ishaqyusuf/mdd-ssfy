import { ErrorFallback } from "@/components/error-fallback";
import { InventoryPartialShipmentPage } from "@/components/inventory/inventory-partial-shipment-page";
import PageShell from "@/components/page-shell";
import { TableSkeleton } from "@/components/tables/skeleton";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type Props = {
	searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
	const queryClient = getQueryClient();
	await props.searchParams;
	await queryClient.fetchQuery(
		trpc.inventories.salesPartialShipmentQueue.queryOptions({
			limit: 100,
			statuses: null,
		}),
	);

	return (
		<PageShell>
			<PageTitle>Inventory Partial Shipments</PageTitle>
			<HydrateClient>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<InventoryPartialShipmentPage />
					</Suspense>
				</ErrorBoundary>
			</HydrateClient>
		</PageShell>
	);
}
