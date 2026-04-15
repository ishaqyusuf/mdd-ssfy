"use client";

import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { communityTemplateFilterParams } from "@/hooks/use-community-template-filter-params";
import type { PageFilterData } from "@api/type";

type Props = {
    initialFilterList?: PageFilterData[];
};

export function CommunityTemplateSearchFilter({ initialFilterList }: Props) {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: communityTemplateFilterParams,
                },
            ]}
        >
            <Content initialFilterList={initialFilterList} />
        </SearchFilterProvider>
    );
}
function Content({ initialFilterList }: Props) {
    const trpc = useTRPC();
    const { data: trpcFilterData } = useQuery({
        ...trpc.filters.communityTemplateFilters.queryOptions(),
        initialData: initialFilterList,
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
