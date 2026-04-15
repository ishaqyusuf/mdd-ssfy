"use client";

import { SearchFilter } from "@gnd/ui/search-filter";
import { OpenBuilderModal } from "./open-builder-modal";
import { builderFilterParams } from "@/hooks/use-builder-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { useQueryStates } from "nuqs";

type Props = {
    initialFilterList?: PageFilterData[];
};

export function BuilderHeader({ initialFilterList }: Props) {
    const trpc = useTRPC();
    const [filters, setFilters] = useQueryStates(builderFilterParams);
    return (
        <div className="flex justify-between">
            <SearchFilter
                filterSchema={builderFilterParams}
                placeholder="Search Builders..."
                trpcRoute={trpc.filters.builder}
                initialFilterList={initialFilterList}
                {...{ filters, setFilters }}
            />
            <div className="flex-1"></div>
            <OpenBuilderModal />
        </div>
    );
}
