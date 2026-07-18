import PageShell from "@/components/page-shell";
import { ShelfItemsManager } from "@/components/sales-book/shelf-items-manager";
import { ScrollableContent } from "@/components/scrollable-content";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";

export const dynamic = "force-dynamic";

export default async function Page() {
	const initialSettings = await getInitialTableSettings("shelf-items");

	batchPrefetch([
		trpc.salesShelfItems.listProducts.queryOptions({
			query: "",
			categoryId: null,
			status: "active",
			page: 1,
			limit: 50,
		}),
		trpc.salesShelfItems.listCategories.queryOptions({}),
	]);

	return (
		<PageShell>
			<HydrateClient>
				<ScrollableContent>
					<div className="flex flex-col gap-6">
						<PageTitle>Shelf Items</PageTitle>
						<ShelfItemsManager initialSettings={initialSettings} />
					</div>
				</ScrollableContent>
			</HydrateClient>
		</PageShell>
	);
}
