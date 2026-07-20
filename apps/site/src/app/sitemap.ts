import { getQueryClient, trpc } from "@/trpc/server";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = (
		process.env.STOREFRONT_APP_URL ||
		process.env.NEXT_PUBLIC_APP_URL ||
		"http://localhost:3018"
	).replace(/\/$/, "");
	const data = await getQueryClient().fetchQuery(
		trpc.storefrontCommerce.catalog.sitemap.queryOptions(),
	);
	return [
		{ url: baseUrl, changeFrequency: "weekly", priority: 1 },
		{ url: `${baseUrl}/search`, changeFrequency: "daily", priority: 0.8 },
		...data.categories.map((item) => ({
			url: `${baseUrl}/categories/${item.slug}`,
			lastModified: item.updatedAt,
			changeFrequency: "daily" as const,
			priority: 0.8,
		})),
		...data.offers.map((item) => ({
			url: `${baseUrl}/products/${item.slug}`,
			lastModified: item.updatedAt,
			changeFrequency: "weekly" as const,
			priority: 0.7,
		})),
		...data.pages
			.filter((item) => item.slug !== "home")
			.map((item) => ({
				url: `${baseUrl}/${item.slug}`,
				lastModified: item.updatedAt,
				changeFrequency: "monthly" as const,
				priority: 0.5,
			})),
	];
}
