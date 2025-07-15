"use client";
import { inboundFilterParamsSchema } from "@/hooks/use-inbound-filter-params";
import {
    SearchFilterProvider,
    useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { dispatchFilterParamsSchema } from "@/hooks/use-dispatch-filter-params";

export function DispatchSearchFilter() {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: dispatchFilterParamsSchema,
                },
            ]}
        >
            <Content />
        </SearchFilterProvider>
    );
}
function Content({}) {
    const ctx = useSearchFilterContext();
    const { shouldFetch } = ctx;
    const trpc = useTRPC();
    const { data: trpcFilterData } = useQuery({
        enabled: shouldFetch,
        ...trpc.dispatch.filterData.queryOptions(),
    });

    return (
        <>
            <SearchFilterTRPC filterList={trpcFilterData} />
        </>
    );
}

