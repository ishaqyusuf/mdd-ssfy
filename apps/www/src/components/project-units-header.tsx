"use client";

import { SearchFilter } from "@gnd/ui/search-filter";
import { OpenProjectUnitSheet } from "./open-project-units-sheet";
import { projectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { useTRPC } from "@/trpc/client";
import { useQueryStates } from "nuqs";

export function ProjectUnitHeader({}) {
    const trpc = useTRPC();
    const [filters, setFilters] = useQueryStates(projectUnitFilterParams);
    return (
        <div className="flex justify-between">
            <SearchFilter
                filterSchema={projectUnitFilterParams}
                placeholder="Search ProjectUnits..."
                debounceMs={300}
                trpcRoute={trpc.filters.projectUnit}
                {...{ filters, setFilters }}
            />
            <div className="flex-1"></div>
            <OpenProjectUnitSheet />
        </div>
    );
}
