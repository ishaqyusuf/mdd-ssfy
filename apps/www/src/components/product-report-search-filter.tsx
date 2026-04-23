"use client";

import { productReportFilterParams } from "@/hooks/use-product-report-filter-params";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function ProductReportSearchFilter({ initialFilterList }: Props) {
	return (
		<SearchFilterProvider
			args={[
				{
					filterSchema: productReportFilterParams,
				},
			]}
		>
			<Content initialFilterList={initialFilterList} />
		</SearchFilterProvider>
	);
}
function Content({ initialFilterList }: Props) {
	const trpc = useTRPC();
	const { data: trpcFilterData } = useQuery({
		...trpc.filters.productReport.queryOptions(),
		initialData: initialFilterList,
	});
	return (
		<>
			<SearchFilterTRPC
				placeholder={"Search Product..."}
				filterList={trpcFilterData}
			/>
		</>
	);
}
