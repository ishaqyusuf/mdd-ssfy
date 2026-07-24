"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { StorefrontOfferCard } from "./storefront-offer-card";

export function FeaturedProducts() {
	const trpc = useTRPC();
	const { data, isPending } = useQuery(
		trpc.storefrontCommerce.catalog.featured.queryOptions({ limit: 8 }),
	);

	if (isPending) {
		return (
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{["one", "two", "three", "four"].map((key) => (
					<div
						key={key}
						className="aspect-[4/5] animate-pulse rounded-lg bg-muted"
					/>
				))}
			</div>
		);
	}

	if (!data?.items.length) {
		return (
			<p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
				Featured products will appear here when they are published.
			</p>
		);
	}

	return (
		<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			{data.items.map((offer) => (
				<StorefrontOfferCard key={offer.id} offer={offer} />
			))}
		</div>
	);
}
