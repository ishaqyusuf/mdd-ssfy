import { db } from "@gnd/db";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = (
		process.env.STOREFRONT_APP_URL ||
		process.env.NEXT_PUBLIC_APP_URL ||
		"http://localhost:3018"
	).replace(/\/$/, "");
	const [categories, offers, pages] = await Promise.all([
		db.storefrontCategory.findMany({
			where: {
				status: "PUBLISHED",
				publishedAt: { lte: new Date() },
				deletedAt: null,
			},
			select: { slug: true, updatedAt: true },
			take: 1_000,
		}),
		db.storefrontOffer.findMany({
			where: {
				status: "PUBLISHED",
				publishedAt: { lte: new Date() },
				deletedAt: null,
			},
			select: { slug: true, updatedAt: true },
			take: 10_000,
		}),
		db.storefrontPage.findMany({
			where: {
				status: "PUBLISHED",
				publishedAt: { lte: new Date() },
				deletedAt: null,
			},
			select: { slug: true, updatedAt: true },
			take: 1_000,
		}),
	]);
	return [
		{ url: baseUrl, changeFrequency: "weekly", priority: 1 },
		{ url: `${baseUrl}/search`, changeFrequency: "daily", priority: 0.8 },
		...categories.map((item) => ({
			url: `${baseUrl}/categories/${item.slug}`,
			lastModified: item.updatedAt,
			changeFrequency: "daily" as const,
			priority: 0.8,
		})),
		...offers.map((item) => ({
			url: `${baseUrl}/products/${item.slug}`,
			lastModified: item.updatedAt,
			changeFrequency: "weekly" as const,
			priority: 0.7,
		})),
		...pages
			.filter((item) => item.slug !== "home")
			.map((item) => ({
				url: `${baseUrl}/${item.slug}`,
				lastModified: item.updatedAt,
				changeFrequency: "monthly" as const,
				priority: 0.5,
			})),
	];
}
