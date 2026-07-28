import { StorefrontPromotionsPanel } from "@/components/storefront/storefront-promotions-panel";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function StorefrontPromotionsPage() {
	await batchPrefetch([
		trpc.storefrontAdmin.promotions.list.queryOptions({ limit: 50 }),
	]);
	return (
		<HydrateClient>
			<StorefrontPromotionsPanel />
		</HydrateClient>
	);
}
