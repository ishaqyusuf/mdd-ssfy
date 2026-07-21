import { getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
	redirect(`/product/${offer.category.slug}/${offer.slug}`);
}
