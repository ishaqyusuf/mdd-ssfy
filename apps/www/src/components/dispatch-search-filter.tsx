"use client";

import { dispatchFilterParamsSchema } from "@/hooks/use-dispatch-filter-params";
import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";

export function DispatchSearchFilter() {
	return (
		<SearchFilterProvider
			args={[
				{
					filterSchema: dispatchFilterParamsSchema,
				},
			]}
		>
			<Content />
		</SearchFilterProvider>
	);
}
function Content() {
	const ctx = useSearchFilterContext();
	const { shouldFetch } = ctx;
	const trpc = useTRPC();
	const { data: trpcFilterData } = useQuery({
		enabled: shouldFetch,
		...trpc.filters.dispatch.queryOptions(),
	});

	return (
		<>
			<SearchFilterTRPC
				commitMode="submit"
				placeholder="Search dispatch information"
				filterList={trpcFilterData}
			/>
		</>
	);
}
