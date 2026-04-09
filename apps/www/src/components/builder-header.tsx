"use client";

import { SearchFilter } from "@gnd/ui/search-filter";
import { OpenBuilderModal } from "./open-builder-modal";
import { builderFilterParams } from "@/hooks/use-builder-filter-params";
import { _trpc } from "@/components/static-trpc";
import { useQueryStates } from "nuqs";

export function BuilderHeader({}) {
    const [filters, setFilters] = useQueryStates(builderFilterParams);
    return (
        <div className="flex justify-between">
            <SearchFilter
                filterSchema={builderFilterParams}
                placeholder="Search Builders..."
                trpcRoute={_trpc.filters.builder}
                {...{ filters, setFilters }}
            />
            <div className="flex-1"></div>
            <OpenBuilderModal />
        </div>
    );
}

