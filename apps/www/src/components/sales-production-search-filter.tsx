"use client";

import { salesProductionFilterParamsSchema } from "@/hooks/use-sales-production-filter-params";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";

type Props = {
	initialFilterList?: PageFilterData[];
	workerMode?: boolean;
};

export function SalesProductionSearchFilter({
	initialFilterList,
	workerMode = false,
}: Props) {
	return (
		<SearchFilterProvider
			args={[
				{
					filterSchema: salesProductionFilterParamsSchema,
				},
			]}
		>
			<Content initialFilterList={initialFilterList} workerMode={workerMode} />
		</SearchFilterProvider>
	);
}
function Content({ initialFilterList, workerMode = false }: Props) {
	const trpc = useTRPC();
	const { data } = useQuery({
		...trpc.filters.salesProductions.queryOptions(),
		initialData: initialFilterList,
	});
	const trpcFilterData = data?.filter((e) => {
		if (workerMode) {
			return e.value !== "assignedToId";
		}
		return true;
	});
	return (
		<>
			<SearchFilterTRPC
				placeholder={"Search Order Production Information"}
				filterList={trpcFilterData}
			/>
		</>
	);
}
