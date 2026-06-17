"use client";

import { inventoryFilterParamsSchema } from "@/hooks/use-inventory-filter-params";
import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";

type Props = {
	placeholder?: string;
};

export function InventorySearchFilter({
	placeholder = "Search Inventories",
}: Props) {
	return (
		<SearchFilterProvider
			args={[
				{
					filterSchema: inventoryFilterParamsSchema,
				},
			]}
		>
			<Content placeholder={placeholder} />
		</SearchFilterProvider>
	);
}
function Content({ placeholder }: Required<Props>) {
	const { shouldFetch } = useSearchFilterContext();
	const trpc = useTRPC();
	const { data: trpcFilterData, isFetching } = useQuery({
		enabled: shouldFetch,
		...trpc.filters.inventory.queryOptions(),
	});

	return (
		<>
			<SearchFilterTRPC
				debounceMs={300}
				placeholder={placeholder}
				filterList={trpcFilterData}
				loading={shouldFetch && isFetching}
			/>
		</>
	);
}
