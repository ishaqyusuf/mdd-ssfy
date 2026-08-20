"use client";

import { employeeSearchFilterParams } from "@/hooks/use-employee-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import type { ReactNode } from "react";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";
import { OpenEmployeeSheet } from "./open-employee-sheet";
import { EmployeesColumnVisibility } from "./tables-2/employees/column-visibility";

type Props = {
	initialFilterList?: PageFilterData[];
	pageTabs?: ReactNode;
};

export function EmployeeHeader({ initialFilterList, pageTabs }: Props) {
	const trpc = useTRPC();
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<SearchFilter
				filterSchema={employeeSearchFilterParams}
				placeholder="Search Employees..."
				trpcRoute={trpc.filters.employee}
				initialFilterList={initialFilterList}
				pageTabs={pageTabs}
			/>
			<div className="flex justify-end gap-2">
				<EmployeesColumnVisibility />
				<OpenEmployeeSheet />
			</div>
		</div>
	);
}
