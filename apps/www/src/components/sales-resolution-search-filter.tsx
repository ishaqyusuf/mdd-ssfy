"use client";

import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { resolutionCenterFilterParamsSchema } from "@/hooks/use-resolution-center-filter-params";
import type { PageFilterData } from "@api/type";

type Props = {
    initialFilterList?: PageFilterData[];
};

export function SalesResoltionSearchFilter({ initialFilterList }: Props) {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: resolutionCenterFilterParamsSchema,
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
        ...trpc.filters.salesResolutions.queryOptions(),
        initialData: initialFilterList,
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
