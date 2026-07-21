import { StorefrontOrdersPanel } from "@/components/storefront/storefront-operations-panels";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function StorefrontOrdersPage() {
	await batchPrefetch([
		trpc.storefrontAdmin.operations.orders.queryOptions({ limit: 25 }),
	]);
	return (
		<HydrateClient>
			<StorefrontOrdersPanel />
		</HydrateClient>
	);
}
