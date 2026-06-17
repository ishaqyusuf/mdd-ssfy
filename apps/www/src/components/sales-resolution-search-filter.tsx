"use client";

import { resolutionCenterFilterParamsSchema } from "@/hooks/use-resolution-center-filter-params";
import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function SalesResoltionSearchFilter({ initialFilterList }: Props) {
	return (
		<SearchFilterProvider
			args={[
				{
					filterSchema: resolutionCenterFilterParamsSchema,
				},
			]}
		>
			<Content initialFilterList={initialFilterList} />
		</SearchFilterProvider>
	);
}
function Content({ initialFilterList }: Props) {
	const trpc = useTRPC();
	const { shouldFetch } = useSearchFilterContext();
	const { data: trpcFilterData, isFetching } = useQuery({
		enabled: shouldFetch,
		...trpc.filters.salesResolutions.queryOptions(),
		initialData: initialFilterList,
	});
	return (
		<>
			<SearchFilterTRPC
				placeholder={"Search Order Information"}
				filterList={trpcFilterData}
				loading={shouldFetch && isFetching}
			/>
		</>
	);
}
