import { StorefrontCategoriesPanel } from "@/components/storefront/storefront-categories-panel";
import { loadStorefrontCatalogFilterParams } from "@/hooks/use-storefront-catalog-filter-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { SearchParams } from "nuqs";

export const dynamic = "force-dynamic";

export default async function StorefrontCategoriesPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const filters = loadStorefrontCatalogFilterParams(await searchParams);
	const queryClient = getQueryClient();
	const categories = await queryClient.fetchQuery(
		trpc.storefrontAdmin.categories.list.queryOptions(),
	);
	const initialCategoryId =
		categories.find((category) => category.id === filters.categoryId)?.id ||
		categories[0]?.id ||
		"";
	if (initialCategoryId) {
		await queryClient.prefetchQuery(
			trpc.storefrontAdmin.categories.products.queryOptions({
				categoryId: initialCategoryId,
				query: filters.q || undefined,
			}),
		);
	}
	return (
		<HydrateClient>
			<StorefrontCategoriesPanel initialCategoryId={initialCategoryId} />
		</HydrateClient>
	);
}
