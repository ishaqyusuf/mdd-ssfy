import { FeaturedCategorySection } from "@/components/featured-category-section";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { FeaturedProducts } from "@/components/storefront/featured-products";
import { StorefrontPageSections } from "@/components/storefront/storefront-page-sections";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";

function DefaultHome() {
	return (
		<>
			<Hero />
			<FeaturedCategorySection />
			<section className="bg-muted/30 py-16">
				<div className="container mx-auto px-4">
					<div className="mb-10 text-center">
						<h2 className="text-3xl font-semibold">Featured products</h2>
						<p className="mt-2 text-muted-foreground">
							Published doors, mouldings, and shelf items.
						</p>
					</div>
					<FeaturedProducts />
				</div>
			</section>
			<section className="py-16">
				<div className="container mx-auto grid gap-8 px-4 md:grid-cols-3">
					{[
						[
							"One product system",
							"Online configurations use the same relationships as the office sales workflow.",
						],
						[
							"Guided configuration",
							"Choose only storefront-published options that remain valid for your product.",
						],
						[
							"Order visibility",
							"Review order and fulfillment information from the same sales record used by our team.",
						],
					].map(([title, body]) => (
						<article key={title} className="rounded-lg border p-6">
							<h2 className="text-xl font-semibold">{title}</h2>
							<p className="mt-2 text-muted-foreground">{body}</p>
						</article>
					))}
				</div>
			</section>
		</>
	);
}

export default function HomePage() {
	batchPrefetch([
		trpc.storefrontCommerce.content.page.queryOptions({ slug: "home" }),
		trpc.storefrontCommerce.catalog.categories.queryOptions(),
		trpc.storefrontCommerce.catalog.search.queryOptions({
			query: "",
			limit: 8,
		}),
	]);
	return (
		<HydrateClient>
			<div className="min-h-screen bg-background">
				<StorefrontPageSections slug="home" fallback={<DefaultHome />} />
				<Footer />
			</div>
		</HydrateClient>
	);
}
