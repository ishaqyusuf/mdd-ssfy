"use client";

import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { salesFilterParamsSchema } from "@/hooks/use-sales-filter-params";
import { communityTemplateFilterParams } from "@/hooks/use-community-template-filter-params";

export function CommunityTemplateSearchFilter() {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: communityTemplateFilterParams,
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
        ...trpc.filters.communityTemplateFilters.queryOptions(),
    });

    return (
        <>
            <SearchFilterTRPC
                placeholder={"Search Community Templates"}
                filterList={trpcFilterData}
            />
        </>
    );
}

