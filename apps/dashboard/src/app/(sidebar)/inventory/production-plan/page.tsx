import { ErrorFallback } from "@/components/error-fallback";
import { InventoryProductionPlanPage } from "@/components/inventory/inventory-production-plan-page";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { InventoryProductionPlanSkeleton } from "@/components/tables-2/inventory-production-plan/skeleton";
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
		"inventory-production-plan",
	);
	const queryInput = {
		limit: 150,
		readinesses: null,
	} satisfies RouterInputs["inventories"]["salesProductionPlan"];

	batchPrefetch([
		trpc.inventories.salesProductionPlan.queryOptions(queryInput),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Inventory Production Plan</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<InventoryProductionPlanSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<InventoryProductionPlanPage
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
