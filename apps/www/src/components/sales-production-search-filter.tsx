"use client";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { salesProductionFilterParamsSchema } from "@/hooks/use-sales-production-filter-params";

export function SalesProductionSearchFilter({ workerMode = false }) {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: salesProductionFilterParamsSchema,
                },
            ]}
        >
            <Content workerMode={workerMode} />
        </SearchFilterProvider>
    );
}
function Content({ workerMode = false }) {
    const trpc = useTRPC();
    const { data } = useQuery({
        ...trpc.filters.salesProductions.queryOptions(),
    });
    const trpcFilterData = data?.filter((e) => {
        if (workerMode) {
            return e.value == "assignedToId" ? false : true;
        }
        return true;
    });
    return (
        <>
            <SearchFilterTRPC
                placeholder={"Search Order Production Information"}
                filterList={trpcFilterData}
            />
        </>
    );
}

