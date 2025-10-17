"use client";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { resolutionCenterFilterParamsSchema } from "@/hooks/use-resolution-center-filter-params";

export function SalesResoltionSearchFilter() {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: resolutionCenterFilterParamsSchema,
                },
            ]}
        >
            <Content />
        </SearchFilterProvider>
    );
}
function Content({}) {
    const trpc = useTRPC();
    const { data: trpcFilterData } = useQuery({
        ...trpc.filters.salesResolutions.queryOptions(),
    });
    return (
        <>
            <SearchFilterTRPC
                placeholder={"Search Order Information"}
                filterList={trpcFilterData}
            />
        </>
    );
}

