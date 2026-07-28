import { StorefrontCartsPanel } from "@/components/storefront/storefront-operations-panels";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function StorefrontCartsPage() {
	await batchPrefetch([
		trpc.storefrontAdmin.operations.carts.queryOptions({ limit: 25 }),
	]);
	return (
		<HydrateClient>
			<StorefrontCartsPanel />
		</HydrateClient>
	);
}
