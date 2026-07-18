import { ErrorFallback } from "@/components/error-fallback";
import { InventoryKindReviewPage } from "@/components/inventory/inventory-kind-review-page";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { InventoryKindReviewSkeleton } from "@/components/tables-2/inventory-kind-review/skeleton";
import { loadSortParams } from "@/hooks/use-sort-params";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
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

export async function generateMetadata() {
	return constructMetadata({
		title: "Inventory Kind Review | GND",
	});
}

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const { sort } = loadSortParams(searchParams);
	const initialSettings = await getInitialTableSettings(
		"inventory-kind-review",
	);
	const queryInput = {
		size: 24,
		sort,
	} satisfies RouterInputs["inventories"]["inventoryProductKindReview"];

	batchPrefetch([
		trpc.inventories.inventoryProductKindReview.infiniteQueryOptions(
			queryInput,
			{
				getNextPageParam: (lastPage) => lastPage.meta?.cursor,
			},
		),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Inventory Kind Review</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<InventoryKindReviewSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<InventoryKindReviewPage
									initialSettings={initialSettings}
									sort={sort}
								/>
							</Suspense>
						</ErrorBoundary>
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
