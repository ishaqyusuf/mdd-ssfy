import { ErrorFallback } from "@/components/error-fallback";
import { CategoryPageClient } from "@/components/storefront/category-page-client";
import { HydrateClient, getQueryClient, prefetch, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

type Props = { params: Promise<{ categorySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { categorySlug } = await params;
	const category = await getQueryClient().fetchQuery(
		trpc.storefrontCommerce.catalog.category.queryOptions({
			slug: categorySlug,
		}),
	);
	const seo =
		category.seo &&
		typeof category.seo === "object" &&
		!Array.isArray(category.seo)
			? (category.seo as Record<string, unknown>)
			: {};
	return {
		title: String(seo.title || category.title),
		description: String(seo.description || category.description || ""),
		openGraph: {
			title: String(seo.title || category.title),
			description: String(seo.description || category.description || ""),
			images: category.imageUrl ? [category.imageUrl] : undefined,
		},
	};
}

export default async function CategoryPage({ params }: Props) {
	const { categorySlug } = await params;
	await prefetch(
		trpc.storefrontCommerce.catalog.category.queryOptions({
			slug: categorySlug,
		}),
	);

	return (
		<HydrateClient>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense
					fallback={
						<div className="container mx-auto animate-pulse px-4 py-16">
							Loading category…
						</div>
					}
				>
					<CategoryPageClient slug={categorySlug} />
				</Suspense>
			</ErrorBoundary>
		</HydrateClient>
	);
}
