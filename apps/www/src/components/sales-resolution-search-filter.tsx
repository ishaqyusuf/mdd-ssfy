"use client";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { salesFilterParamsSchema } from "@/hooks/use-sales-filter-params";
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

