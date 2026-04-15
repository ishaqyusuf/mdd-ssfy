"use client";

import { SearchFilter } from "@gnd/ui/search-filter";
import { OpenEmployeeSheet } from "./open-employee-sheet";
import { employeeFilterParams } from "@/hooks/use-employee-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { useQueryStates } from "nuqs";

type Props = {
    initialFilterList?: PageFilterData[];
};

export function EmployeeHeader({ initialFilterList }: Props) {
    const trpc = useTRPC();
    const [filters, setFilters] = useQueryStates(employeeFilterParams);
    return (
        <div className="flex justify-between">
            <SearchFilter
                filterSchema={employeeFilterParams}
                placeholder="Search Employees..."
                trpcRoute={trpc.filters.employee}
                initialFilterList={initialFilterList}
                {...{ filters, setFilters }}
            />
            <div className="flex-1"></div>
            <OpenEmployeeSheet />
        </div>
    );
}
