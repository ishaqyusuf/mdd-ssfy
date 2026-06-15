import { ErrorFallback } from "@/components/error-fallback";
import { InventoryVariantsWorkspacePage } from "@/components/inventory/inventory-variants-workspace-page";
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
		title: "Inventory Variants | GND",
	});
}

export default async function Page() {
	const queryClient = getQueryClient();

	await queryClient.fetchQuery(
		trpc.inventories.inventoryVariantsWorkspace.queryOptions({
			limit: 50,
		}),
	);

	return (
		<PageShell className="gap-6">
			<PageTitle>Inventory Variants</PageTitle>
			<HydrateClient>
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense fallback={<TableSkeleton />}>
						<InventoryVariantsWorkspacePage />
					</Suspense>
				</ErrorBoundary>
			</HydrateClient>
		</PageShell>
	);
}
