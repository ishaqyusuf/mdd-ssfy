import { ErrorFallback } from "@/components/error-fallback";
import { StorefrontSearchPageClient } from "@/components/storefront/search-page-client";
import { loadStorefrontSearchParams } from "@/hooks/use-storefront-search-params";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Products | GND Millwork",
};

export default async function SearchPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const filter = loadStorefrontSearchParams(await searchParams);
	await batchPrefetch([
		trpc.storefrontCommerce.catalog.categories.queryOptions(),
		trpc.storefrontCommerce.catalog.search.queryOptions({
			query: filter.q,
			categorySlug: filter.category ?? undefined,
			limit: 48,
		}),
	]);

	return (
		<HydrateClient>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense
					fallback={
						<div className="container mx-auto animate-pulse px-4 py-16">
							Loading products…
						</div>
					}
				>
					<StorefrontSearchPageClient />
				</Suspense>
			</ErrorBoundary>
		</HydrateClient>
	);
}
