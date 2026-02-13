"use client";
import { SearchFilter } from "@gnd/ui/search-filter";
import { OpenEmployeeSheet } from "./open-employee-sheet";
import { employeeFilterParams } from "@/hooks/use-employee-filter-params";
import { _trpc } from "@/components/static-trpc";
import { useQueryStates } from "nuqs";

export function EmployeeHeader({}) {
    const [filters, setFilters] = useQueryStates(employeeFilterParams);
    return (
        <div className="flex justify-between">
            <SearchFilter
                filterSchema={employeeFilterParams}
                placeholder="Search Employees..."
                trpcRoute={_trpc.filters.employee}
                {...{ filters, setFilters }}
            />
            <div className="flex-1"></div>
            <OpenEmployeeSheet />
        </div>
    );
}

