import { StorefrontCatalogGrid } from "@/components/storefront/catalog/storefront-catalog-grid";
import { loadStorefrontCatalogFilterParams } from "@/hooks/use-storefront-catalog-filter-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { SearchParams } from "nuqs";

export const dynamic = "force-dynamic";

export default async function StorefrontCatalogPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const filters = loadStorefrontCatalogFilterParams(await searchParams);
	const input = {
		query: filters.q || undefined,
		family: filters.family || undefined,
		status: filters.status || undefined,
		featured: filters.featured ?? undefined,
		profileId: filters.profileId || undefined,
		limit: 24,
	};
	const queryClient = getQueryClient();
	const catalogOptions = trpc.storefrontAdmin.catalog.list.infiniteQueryOptions(
		input,
		{
			getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
		},
	);
	const familiesOptions = trpc.storefrontAdmin.catalog.families.queryOptions();
	const profilesOptions = trpc.storefrontAdmin.catalog.profiles.queryOptions();
	const [catalog, families, profiles] = await Promise.all([
		queryClient.fetchInfiniteQuery(catalogOptions),
		queryClient.fetchQuery(familiesOptions),
		queryClient.fetchQuery(profilesOptions),
	]);
	return (
		<HydrateClient>
			<StorefrontCatalogGrid
				initialCatalog={catalog}
				initialFamilies={families}
				initialProfiles={profiles}
			/>
		</HydrateClient>
	);
}
