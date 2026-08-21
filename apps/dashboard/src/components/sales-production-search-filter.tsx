"use client";

import { salesProductionFilterParamsSchema } from "@/hooks/use-sales-production-filter-params";
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
	workerMode?: boolean;
	showSavedViews?: boolean;
};

export function SalesProductionSearchFilter({
	initialFilterList,
	workerMode = false,
	showSavedViews = true,
}: Props) {
	return (
		<SearchFilterProvider
			args={[
				{
					filterSchema: salesProductionFilterParamsSchema,
				},
			]}
		>
			<Content
				initialFilterList={initialFilterList}
				workerMode={workerMode}
				showSavedViews={showSavedViews}
			/>
		</SearchFilterProvider>
	);
}
function Content({
	initialFilterList,
	workerMode = false,
	showSavedViews = true,
}: Props) {
	const trpc = useTRPC();
	const { shouldFetch } = useSearchFilterContext();
	const { data, isFetching } = useQuery({
		enabled: shouldFetch,
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
				loading={shouldFetch && isFetching}
				pageTabs={showSavedViews ? undefined : null}
				hiddenFilterKeys={
					workerMode
						? [
								"tab",
								"view",
								"calendarView",
								"calendarDate",
								"production",
								"productionDueDate",
								"show",
								"label",
								"queue",
								"due",
								"date",
							]
						: undefined
				}
			/>
		</>
	);
}
