"use client";

import { employeeFilterParams } from "@/hooks/use-employee-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";
import { OpenEmployeeSheet } from "./open-employee-sheet";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function EmployeeHeader({ initialFilterList }: Props) {
	const trpc = useTRPC();
	return (
		<div className="flex justify-between">
			<SearchFilter
				filterSchema={employeeFilterParams}
				placeholder="Search Employees..."
				trpcRoute={trpc.filters.employee}
				initialFilterList={initialFilterList}
			/>
			<div className="flex-1" />
			<OpenEmployeeSheet />
		</div>
	);
}
