import { ErrorFallback } from "@/components/error-fallback";
import { ProductConfigurator } from "@/components/storefront/product-configurator";
import { HydrateClient, getQueryClient, prefetch, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

type Props = { params: Promise<{ productSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { productSlug } = await params;
	const offer = await getQueryClient().fetchQuery(
		trpc.storefrontCommerce.catalog.offer.queryOptions({ slug: productSlug }),
	);
	const seo =
		offer.seo && typeof offer.seo === "object" && !Array.isArray(offer.seo)
			? (offer.seo as Record<string, unknown>)
			: {};
	return {
		title: String(seo.title || offer.title),
		description: String(seo.description || offer.description || ""),
		openGraph: {
			title: String(seo.title || offer.title),
			description: String(seo.description || offer.description || ""),
			images: offer.imageUrl ? [offer.imageUrl] : undefined,
		},
	};
}

export default async function ProductPage({ params }: Props) {
	const { productSlug } = await params;
	const offer = await getQueryClient().fetchQuery(
		trpc.storefrontCommerce.catalog.offer.queryOptions({ slug: productSlug }),
	);
	prefetch(
		trpc.storefrontCommerce.catalog.offer.queryOptions({ slug: productSlug }),
	);

	return (
		<HydrateClient>
			<script type="application/ld+json">
				{JSON.stringify({
					"@context": "https://schema.org",
					"@type": "Product",
					name: offer.title,
					description: offer.description || undefined,
					image: offer.imageUrl ? [offer.imageUrl] : undefined,
					category: offer.category.title,
				}).replace(/</g, "\\u003c")}
			</script>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense
					fallback={
						<div className="container mx-auto animate-pulse px-4 py-16">
							Loading product configurator…
						</div>
					}
				>
					<ProductConfigurator slug={productSlug} />
				</Suspense>
			</ErrorBoundary>
		</HydrateClient>
	);
}
