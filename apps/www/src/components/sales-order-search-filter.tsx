"use client";

import { useAuth } from "@/hooks/use-auth";
import { salesFilterParamsSchema } from "@/hooks/use-sales-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";

type Props = {
    initialFilterList?: PageFilterData[];
};

export function OrderSearchFilter({ initialFilterList }: Props) {
    const auth = useAuth();
    const trpc = useTRPC();

    return (
        <SearchFilter
            filterSchema={salesFilterParamsSchema}
            initialFilterList={initialFilterList}
            placeholder="Search order information..."
            trpcRoute={trpc.filters.salesOrders}
            trpQueryOptions={{
                salesManager: auth?.can?.viewSalesManager,
            }}
        />
    );
}
