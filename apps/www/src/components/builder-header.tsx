"use client";

import { builderFilterParams } from "@/hooks/use-builder-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";
import { OpenBuilderModal } from "./open-builder-modal";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function BuilderHeader({ initialFilterList }: Props) {
	const trpc = useTRPC();
	return (
		<div className="flex justify-between">
			<SearchFilter
				filterSchema={builderFilterParams}
				placeholder="Search Builders..."
				trpcRoute={trpc.filters.builder}
				initialFilterList={initialFilterList}
			/>
			<div className="flex-1" />
			<OpenBuilderModal />
		</div>
	);
}
