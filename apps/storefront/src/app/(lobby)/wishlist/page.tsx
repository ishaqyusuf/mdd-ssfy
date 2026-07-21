import { WishlistPageClient } from "@/components/storefront/wishlist-page-client";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { Suspense } from "react";

export default async function WishlistPage() {
	await prefetch(trpc.storefrontCommerce.wishlist.get.queryOptions());
	return (
		<HydrateClient>
			<Suspense
				fallback={<div className="container mx-auto px-4 py-16">Loading…</div>}
			>
				<WishlistPageClient />
			</Suspense>
		</HydrateClient>
	);
}
