"use client";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { salesFilterParamsSchema } from "@/hooks/use-sales-filter-params";
import { resolutionCenterFilterParamsSchema } from "@/hooks/use-resolution-center-filter-params";
import { useDebugPrint } from "@/hooks/use-debug-print";

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
    useDebugPrint("RESOLUTION FILTER DATA", trpcFilterData);
    return (
        <>
            <SearchFilterTRPC
                placeholder={"Search Order Information"}
                filterList={trpcFilterData}
            />
        </>
    );
}

