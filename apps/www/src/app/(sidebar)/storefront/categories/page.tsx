import { StorefrontCategoriesPanel } from "@/components/storefront/storefront-categories-panel";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function StorefrontCategoriesPage() {
	await batchPrefetch([trpc.storefrontAdmin.categories.list.queryOptions()]);
	return (
		<HydrateClient>
			<StorefrontCategoriesPanel />
		</HydrateClient>
	);
}
