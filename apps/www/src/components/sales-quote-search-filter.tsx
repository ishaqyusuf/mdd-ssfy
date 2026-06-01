"use client";

import { useAuth } from "@/hooks/use-auth";
import { salesFilterParamsSchema } from "@/hooks/use-sales-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";

type Props = {
    initialFilterList?: PageFilterData[];
};

export function SalesQuoteSearchFilter({ initialFilterList }: Props) {
    const auth = useAuth();
    const trpc = useTRPC();

    return (
        <SearchFilter
            commitMode="submit"
            filterSchema={salesFilterParamsSchema}
            initialFilterList={initialFilterList}
            placeholder="Search quote information..."
            trpcRoute={trpc.filters.salesQuotes}
            trpQueryOptions={{
                salesManager: auth?.can?.viewSalesManager,
            }}
        />
    );
}
