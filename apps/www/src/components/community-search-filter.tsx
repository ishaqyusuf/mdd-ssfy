"use client";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { inventoryFilterParamsSchema } from "@/hooks/use-inventory-filter-params";

export function CommunitySearchFilter() {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: inventoryFilterParamsSchema,
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
        ...trpc.filters.inventory.queryOptions(),
    });

    return (
        <>
            <SearchFilterTRPC
                placeholder={"Search Projects"}
                filterList={trpcFilterData}
            />
        </>
    );
}

