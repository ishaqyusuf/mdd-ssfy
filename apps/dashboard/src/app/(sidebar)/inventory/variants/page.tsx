import { ErrorFallback } from "@/components/error-fallback";
import { InventoryVariantsWorkspacePage } from "@/components/inventory/inventory-variants-workspace-page";
import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { InventoryVariantsSkeleton } from "@/components/tables-2/inventory-variants/skeleton";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
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
		title: "Inventory Variants | GND",
	});
}

function nullableNumber(value: SearchParams[string]) {
	const raw = Array.isArray(value) ? value[0] : value;
	if (!raw) return null;
	const numeric = Number(raw);
	return Number.isFinite(numeric) ? numeric : null;
}

export default async function Page(props: Props) {
	const searchParams = await props.searchParams;
	const initialSettings = await getInitialTableSettings("inventory-variants");
	const queryInput = {
		q: null,
		inventoryId: nullableNumber(searchParams.inventoryId),
		categoryId: null,
		supplierId: null,
		status: null,
		stockMode: null,
		lowStock: false,
		limit: 50,
	};

	batchPrefetch([
		trpc.inventories.inventoryVariantsWorkspace.queryOptions(queryInput),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-4">
						<PageTitle>Inventory Variants</PageTitle>
						<ErrorBoundary errorComponent={ErrorFallback}>
							<Suspense
								fallback={
									<InventoryVariantsSkeleton
										initialSettings={initialSettings}
									/>
								}
							>
								<InventoryVariantsWorkspacePage
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
