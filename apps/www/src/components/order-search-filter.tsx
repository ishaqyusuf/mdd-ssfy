"use client";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { orderFilterParamsSchema } from "@/hooks/use-order-filter-params";

export function OrderSearchFilter() {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: orderFilterParamsSchema,
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
        ...trpc.filters.salesOrders.queryOptions(),
    });

    return (
        <>
            <SearchFilterTRPC filterList={trpcFilterData} />
        </>
    );
}
