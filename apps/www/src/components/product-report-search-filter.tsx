"use client";

import { productReportFilterParams } from "@/hooks/use-product-report-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";

type Props = {
    initialFilterList?: PageFilterData[];
};

export function ProductReportSearchFilter({ initialFilterList }: Props) {
    const trpc = useTRPC();

    return (
        <SearchFilter
            debounceMs={300}
            filterSchema={productReportFilterParams}
            initialFilterList={initialFilterList}
            placeholder="Search Product..."
            trpcRoute={trpc.filters.productReport}
        />
    );
}
