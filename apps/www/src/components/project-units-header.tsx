"use client";

import { projectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { useTRPC } from "@/trpc/client";
import { SearchFilter } from "@gnd/ui/search-filter";
import { useQueryStates } from "nuqs";
import { OpenProjectUnitSheet } from "./open-project-units-sheet";

export function ProjectUnitHeader() {
	const trpc = useTRPC();
	const [filters, setFilters] = useQueryStates(projectUnitFilterParams);
	return (
		<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0 flex-1">
				<SearchFilter
					filterSchema={projectUnitFilterParams}
					placeholder="Search ProjectUnits..."
					debounceMs={300}
					initialFilterList={[]}
					trpcRoute={trpc.filters.projectUnit}
					{...{ filters, setFilters }}
				/>
			</div>
			<div className="flex shrink-0 justify-end">
				<OpenProjectUnitSheet />
			</div>
		</div>
	);
}
