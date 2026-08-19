"use client";

import { dispatchFilterParamsSchema } from "@/hooks/use-dispatch-filter-params";
import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import type { ReactNode } from "react";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";

type DispatchSearchFilterProps = {
	pageTabs?: ReactNode;
	toolbarActions?: ReactNode;
};

export function DispatchSearchFilter({
	pageTabs,
	toolbarActions,
}: DispatchSearchFilterProps) {
	return (
		<SearchFilterProvider
			args={[
				{
					filterSchema: dispatchFilterParamsSchema,
				},
			]}
		>
			<Content pageTabs={pageTabs} toolbarActions={toolbarActions} />
		</SearchFilterProvider>
	);
}
function Content({ pageTabs, toolbarActions }: DispatchSearchFilterProps) {
	const ctx = useSearchFilterContext();
	const { shouldFetch } = ctx;
	const trpc = useTRPC();
	const { data: trpcFilterData, isFetching } = useQuery({
		enabled: shouldFetch,
		...trpc.filters.dispatch.queryOptions(),
	});

	return (
		<>
			<SearchFilterTRPC
				placeholder="Search dispatch information"
				filterList={trpcFilterData}
				loading={shouldFetch && isFetching}
				pageTabs={pageTabs}
				toolbarActions={toolbarActions}
			/>
		</>
	);
}
