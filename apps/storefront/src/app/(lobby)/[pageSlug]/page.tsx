import { Footer } from "@/components/footer";
import { StorefrontPageSections } from "@/components/storefront/storefront-page-sections";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ pageSlug: string }> };
const pageSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { pageSlug } = await params;
	if (!pageSlugPattern.test(pageSlug)) return {};
	const page = await getQueryClient().fetchQuery(
		trpc.storefrontCommerce.content.page.queryOptions({ slug: pageSlug }),
	);
	if (!page) return {};
	const seo =
		page.seo && typeof page.seo === "object"
			? (page.seo as Record<string, unknown>)
			: {};
	return {
		title: String(seo.title || `${page.title} | GND Millwork`),
		description: String(seo.description || page.description || ""),
	};
}

export default async function StorefrontContentPage({ params }: Props) {
	const { pageSlug } = await params;
	if (!pageSlugPattern.test(pageSlug)) notFound();
	const page = await getQueryClient().fetchQuery(
		trpc.storefrontCommerce.content.page.queryOptions({ slug: pageSlug }),
	);
	if (!page) notFound();
	return (
		<HydrateClient>
			<div className="min-h-screen">
				<header className="border-b py-12">
					<div className="container mx-auto px-4">
						<h1 className="text-4xl font-semibold">{page.title}</h1>
						{page.description && (
							<p className="mt-3 max-w-3xl text-muted-foreground">
								{page.description}
							</p>
						)}
					</div>
				</header>
				<StorefrontPageSections slug={pageSlug} />
				<Footer />
			</div>
		</HydrateClient>
	);
}
