"use client";

import { builderFilterParams } from "@/hooks/use-builder-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";
import { OpenBuilderModal } from "./open-builder-modal";
import { CommunityBuildersColumnVisibility } from "./tables-2/community-builders/column-visibility";

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
			<div className="flex flex-1 items-center justify-end gap-2">
				<CommunityBuildersColumnVisibility />
				<OpenBuilderModal />
			</div>
		</div>
	);
}
