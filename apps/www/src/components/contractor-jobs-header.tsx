"use client";
import { SearchFilter } from "@gnd/ui/search-filter";
import { OpenJobSheet } from "./open-contractor-jobs-sheet";
import { jobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { _trpc } from "@/components/static-trpc";
import { useQueryStates } from "nuqs";

export function JobHeader({}) {
    const [filters, setFilters] = useQueryStates(jobFilterParams);
    return (
        <div className="flex justify-between">
            <SearchFilter
                filterSchema={jobFilterParams}
                placeholder="Search Jobs..."
                trpcRoute={_trpc.filters.job}
                {...{ filters, setFilters }}
            />
            <div className="flex-1"></div>
            <OpenJobSheet />
        </div>
    );
}

