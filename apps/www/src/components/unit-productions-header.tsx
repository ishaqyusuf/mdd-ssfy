"use client";

import { UnitProductionsColumnVisibility } from "@/components/tables-2/unit-productions/column-visibility";
import { unitProductionFilterParams } from "@/hooks/use-unit-productions-filter-params";
import { useTRPC } from "@/trpc/client";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";

export function UnitProductionsHeader() {
	const trpc = useTRPC();

	return (
		<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
			<SearchFilter
				filterSchema={unitProductionFilterParams}
				placeholder="Search unit productions..."
				trpcRoute={trpc.filters.unitProduction}
			/>
			<div className="flex shrink-0 items-center justify-end">
				<UnitProductionsColumnVisibility />
			</div>
		</div>
	);
}
