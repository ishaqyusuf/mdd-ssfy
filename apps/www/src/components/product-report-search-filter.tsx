"use client";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { productReportFilterParams } from "@/hooks/use-product-report-filter-params";

export function ProductReportSearchFilter() {
    return (
        <SearchFilterProvider
            args={[
                {
                    filterSchema: productReportFilterParams,
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
        ...trpc.filters.productReport.queryOptions(),
    });
    return (
        <>
            <SearchFilterTRPC
                placeholder={"Search Product..."}
                filterList={trpcFilterData}
            />
        </>
    );
}

