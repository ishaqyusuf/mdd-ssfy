import { ErrorFallback } from "@/components/error-fallback";
import { ProductConfigurator } from "@/components/storefront/product-configurator";
import { ProductSkeleton } from "@/components/product-page/skeleton";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface Props {
	params: Promise<{ categorySlug: string; productSlug: string }>;
}

async function loadOffer(params: Awaited<Props["params"]>) {
	const offer = await getQueryClient().fetchQuery(
		trpc.storefrontCommerce.catalog.offer.queryOptions({
			slug: params.productSlug,
		}),
	);
	if (offer.category.slug !== params.categorySlug) notFound();
	return offer;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const offer = await loadOffer(await params);
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

export default async function Page(props: Props) {
	const params = await props.params;
	const offer = await loadOffer(params);

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
				<Suspense fallback={<ProductSkeleton />}>
					<ProductConfigurator slug={params.productSlug} />
				</Suspense>
			</ErrorBoundary>
		</HydrateClient>
	);
}
