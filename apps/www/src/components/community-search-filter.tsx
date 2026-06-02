"use client";

import { inventoryFilterParamsSchema } from "@/hooks/use-inventory-filter-params";
import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";

export function CommunitySearchFilter() {
	return (
		<SearchFilterProvider
			args={[
				{
					filterSchema: inventoryFilterParamsSchema,
				},
			]}
		>
			<Content />
		</SearchFilterProvider>
	);
}
function Content() {
	const { shouldFetch } = useSearchFilterContext();
	const trpc = useTRPC();
	const { data: trpcFilterData } = useQuery({
		enabled: shouldFetch,
		...trpc.filters.inventory.queryOptions(),
	});

	return (
		<>
			<SearchFilterTRPC
				debounceMs={300}
				placeholder={"Search Projects"}
				filterList={trpcFilterData}
			/>
		</>
	);
}
