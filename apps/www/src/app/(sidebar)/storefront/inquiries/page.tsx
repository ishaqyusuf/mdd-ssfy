import { StorefrontInquiriesPanel } from "@/components/storefront/storefront-operations-panels";
import { HydrateClient } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default function StorefrontInquiriesPage() {
	return (
		<HydrateClient>
			<StorefrontInquiriesPanel />
		</HydrateClient>
	);
}
