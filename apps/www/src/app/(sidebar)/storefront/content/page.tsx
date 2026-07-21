import { StorefrontContentPanel } from "@/components/storefront/storefront-operations-panels";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function StorefrontContentPage() {
	await batchPrefetch([trpc.storefrontAdmin.content.list.queryOptions()]);
	return (
		<HydrateClient>
			<StorefrontContentPanel />
		</HydrateClient>
	);
}
