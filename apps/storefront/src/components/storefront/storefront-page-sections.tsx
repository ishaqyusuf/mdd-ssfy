"use client";

import { FeaturedCategorySection } from "@/components/featured-category-section";
import { Hero } from "@/components/hero";
import { FeaturedProducts } from "@/components/storefront/featured-products";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function text(value: unknown) {
	return typeof value === "string" ? value : "";
}

export function StorefrontPageSections({
	slug,
	fallback,
}: {
	slug: string;
	fallback?: React.ReactNode;
}) {
	const trpc = useTRPC();
	const page = useQuery(
		trpc.storefrontCommerce.content.page.queryOptions({ slug }),
	);
	if (page.isPending) return fallback || null;
	if (!page.data) return fallback || null;
	return (
		<main>
			{page.data.sections.map((section) => {
				const content = record(section.content);
				const title = text(content.title);
				const body = text(content.body);
				const imageUrl = text(content.imageUrl);
				const actionLabel = text(content.actionLabel);
				const actionUrl = text(content.actionUrl);
				if (section.type === "category-grid") {
					return <FeaturedCategorySection key={section.id} />;
				}
				if (section.type === "offer-grid") {
					return (
						<section key={section.id} className="bg-muted/30 py-16">
							<div className="container mx-auto px-4">
								{title && (
									<h2 className="mb-8 text-center text-3xl font-semibold">
										{title}
									</h2>
								)}
								<FeaturedProducts />
							</div>
						</section>
					);
				}
				if (section.type === "hero") {
					return (
						<Hero
							key={section.id}
							title={title || page.data.title}
							description={body || undefined}
							imageUrl={imageUrl || undefined}
							actionLabel={actionLabel || undefined}
							actionUrl={actionUrl || undefined}
						/>
					);
				}
				return (
					<section key={section.id} className="py-14">
						<div className="container mx-auto max-w-4xl px-4">
							{title && <h2 className="text-3xl font-semibold">{title}</h2>}
							{body && (
								<p className="mt-4 whitespace-pre-line text-muted-foreground">
									{body}
								</p>
							)}
							{actionLabel && actionUrl.startsWith("/") && (
								<Button asChild className="mt-5">
									<Link href={actionUrl}>{actionLabel}</Link>
								</Button>
							)}
						</div>
					</section>
				);
			})}
		</main>
	);
}
