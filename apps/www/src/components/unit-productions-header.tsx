"use client";

import { unitProductionFilterParams } from "@/hooks/use-unit-productions-filter-params";
import { useTRPC } from "@/trpc/client";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";

export function UnitProductionsHeader() {
	const trpc = useTRPC();

	return (
		<div className="flex justify-between gap-4">
			<SearchFilter
				filterSchema={unitProductionFilterParams}
				placeholder="Search unit productions..."
				trpcRoute={trpc.filters.unitProduction}
			/>
		</div>
	);
}
