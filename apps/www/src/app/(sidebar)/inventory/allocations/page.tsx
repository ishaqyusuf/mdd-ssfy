import { ErrorFallback } from "@/components/error-fallback";
import { InventoryAllocationReviewPage } from "@/components/inventory/inventory-allocation-review-page";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { InventoryAllocationsSkeleton } from "@/components/tables-2/inventory-allocations/skeleton";
import { loadSortParams } from "@/hooks/use-sort-params";
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
	const searchParams = await props.searchParams;
	const { sort } = loadSortParams(searchParams);
	const initialSettings = await getInitialTableSettings(
		"inventory-allocations",
	);
	const queryInput = {
		size: 20,
		sort,
	} as RouterInputs["inventories"]["pendingAllocations"];

	batchPrefetch([
		trpc.inventories.pendingAllocations.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Inventory Allocations</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<InventoryAllocationsSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<InventoryAllocationReviewPage
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
