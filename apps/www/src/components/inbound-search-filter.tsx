"use client";
import { inboundFilterParamsSchema } from "@/hooks/use-inbound-filter-params";
import {
    SearchFilterProvider,
    useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";

export function InboundSearchFilter() {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: inboundFilterParamsSchema,
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
        ...trpc.filters.inbound.queryOptions(),
    });

    return (
        <>
            <SearchFilterTRPC filterList={trpcFilterData} />
        </>
    );
}

