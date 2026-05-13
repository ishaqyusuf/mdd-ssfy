"use client";

import {
	SearchFilterProvider,
	useSearchFilterContext,
} from "@/hooks/use-search-filter";
import type { PageFilterData } from "@api/type";
import { useQuery } from "@gnd/ui/tanstack";
import type { FilterCommitMode, FilterDefinition } from "./filter-definitions";
import { SearchFilterTRPC } from "./search-filter-trpc";

type SearchFilterAdapterProps = {
	// biome-ignore lint/suspicious/noExplicitAny: nuqs parser maps are intentionally generic across page schemas.
	filterSchema: Partial<Record<string, any>>;
	// biome-ignore lint/suspicious/noExplicitAny: tRPC decorated query procedures do not share a simple public structural type here.
	trpcRoute: any;
	trpQueryOptions?: unknown;
	initialFilterList?: Array<PageFilterData | FilterDefinition>;
	placeholder?: string;
	commitMode?: FilterCommitMode;
	debounceMs?: number;
	searchKey?: string;
};

export function SearchFilterAdapter({
	filterSchema,
	searchKey,
	...props
}: SearchFilterAdapterProps) {
	return (
		<SearchFilterProvider
			args={[
				{
					filterSchema,
					searchKey,
				},
			]}
		>
			<SearchFilterAdapterContent {...props} searchKey={searchKey} />
		</SearchFilterProvider>
	);
}

function SearchFilterAdapterContent({
	trpcRoute,
	trpQueryOptions,
	initialFilterList,
	placeholder = "Search ...",
	commitMode = "debounced",
	debounceMs,
	searchKey,
}: Omit<SearchFilterAdapterProps, "filterSchema">) {
	const { shouldFetch } = useSearchFilterContext();
	const queryOptions = trpcRoute.queryOptions(trpQueryOptions);
	const { data: trpcFilterData } = useQuery({
		enabled: shouldFetch,
		...queryOptions,
		initialData: initialFilterList,
	});

	return (
		<SearchFilterTRPC
			commitMode={commitMode}
			debounceMs={debounceMs}
			placeholder={placeholder}
			filterList={
				(trpcFilterData ?? initialFilterList) as Array<
					PageFilterData | FilterDefinition
				>
			}
			searchKey={searchKey}
		/>
	);
}
