import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const baseUrl = (
		process.env.STOREFRONT_APP_URL ||
		process.env.NEXT_PUBLIC_APP_URL ||
		"http://localhost:3018"
	).replace(/\/$/, "");
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/account", "/orders", "/checkout", "/api/"],
			},
		],
		sitemap: `${baseUrl}/sitemap.xml`,
	};
}
