"use client";

import { employeeSearchFilterParams } from "@/hooks/use-employee-filter-params";
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
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<SearchFilter
				filterSchema={employeeSearchFilterParams}
				placeholder="Search Employees..."
				trpcRoute={trpc.filters.employee}
				initialFilterList={initialFilterList}
			/>
			<div className="flex justify-end">
				<OpenEmployeeSheet />
			</div>
		</div>
	);
}
