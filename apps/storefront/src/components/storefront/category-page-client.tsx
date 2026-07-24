"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { StorefrontOfferCard } from "./storefront-offer-card";

export function CategoryPageClient({ slug }: { slug: string }) {
	const trpc = useTRPC();
	const { data: category } = useSuspenseQuery(
		trpc.storefrontCommerce.catalog.category.queryOptions({ slug }),
	);

	return (
		<main className="container mx-auto px-4 py-10">
			<nav
				className="mb-6 text-sm text-muted-foreground"
				aria-label="Breadcrumb"
			>
				<Link href="/" className="hover:text-foreground">
					Home
				</Link>
				<span className="mx-2">/</span>
				<span className="text-foreground">{category.title}</span>
			</nav>

			<header className="mb-10 max-w-3xl">
				<h1 className="text-4xl font-bold tracking-tight">{category.title}</h1>
				{category.description && (
					<p className="mt-3 text-lg text-muted-foreground">
						{category.description}
					</p>
				)}
			</header>

			{category.offers.length ? (
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{category.offers.map((offer) => (
						<StorefrontOfferCard key={offer.id} offer={offer} showDescription />
					))}
				</div>
			) : (
				<div className="rounded-lg border border-dashed p-12 text-center">
					<h2 className="font-medium">No products are published yet</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Please check back soon.
					</p>
				</div>
			)}
		</main>
	);
}
