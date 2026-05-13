"use client";

import { projectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { useTRPC } from "@/trpc/client";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";
import { OpenProjectUnitSheet } from "./open-project-units-sheet";

export function ProjectUnitHeader() {
	const trpc = useTRPC();
	return (
		<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0 flex-1">
				<SearchFilter
					filterSchema={projectUnitFilterParams}
					placeholder="Search ProjectUnits..."
					debounceMs={300}
					trpcRoute={trpc.filters.projectUnit}
				/>
			</div>
			<div className="flex shrink-0 justify-end">
				<OpenProjectUnitSheet />
			</div>
		</div>
	);
}
