"use client";

import {
    SearchFilterProvider,
    useSearchFilterContext,
} from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { customerFilterParamsSchema } from "@/hooks/use-customer-filter-params";

export function CustomerSearchFilter() {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: customerFilterParamsSchema,
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
        ...trpc.filters.customer.queryOptions(),
    });

    return (
        <>
            <SearchFilterTRPC filterList={trpcFilterData} />
        </>
    );
}

