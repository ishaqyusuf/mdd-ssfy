import { StorefrontSettingsPanel } from "@/components/storefront/storefront-operations-panels";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function StorefrontSettingsPage() {
	await batchPrefetch([
		trpc.storefrontAdmin.settings.get.queryOptions(),
		trpc.storefrontAdmin.settings.salesReps.queryOptions(),
		trpc.storefrontAdmin.promotions.profiles.queryOptions(),
	]);
	return (
		<HydrateClient>
			<StorefrontSettingsPanel />
		</HydrateClient>
	);
}
