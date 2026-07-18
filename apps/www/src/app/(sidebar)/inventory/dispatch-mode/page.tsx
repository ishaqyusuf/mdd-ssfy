import { ErrorFallback } from "@/components/error-fallback";
import { InventoryDispatchModePage } from "@/components/inventory/inventory-dispatch-mode-page";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { InventoryDispatchModeSkeleton } from "@/components/tables-2/inventory-dispatch-mode/skeleton";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import type { RouterInputs } from "@api/trpc/routers/_app";
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
		"inventory-dispatch-mode",
	);
	const queryInput = {
		limit: 100,
		statuses: ["available_now"],
	} satisfies RouterInputs["inventories"]["salesPartialShipmentQueue"];

	batchPrefetch([
		trpc.inventories.salesPartialShipmentQueue.queryOptions(queryInput),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Inventory Dispatch Mode</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<InventoryDispatchModeSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<InventoryDispatchModePage initialSettings={initialSettings} />
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
