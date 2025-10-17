"use client";
import { SearchFilter } from "@gnd/ui/custom/search-filter/index";
import { OpenProjectUnitSheet } from "./open-project-units-sheet";
import { projectUnitFilterParams } from "@/hooks/use-project-units-filter-params";
import { useTRPC } from "@/trpc/client";

export function ProjectUnitHeader({}) {
    const trpc = useTRPC();
    return (
        <div className="flex justify-between">
            <SearchFilter
                filterSchema={projectUnitFilterParams}
                placeholder="Search ProjectUnits..."
                trpcRoute={trpc.filters.projectUnit}
            />
            <div className="flex-1"></div>
            <OpenProjectUnitSheet />
        </div>
    );
}

