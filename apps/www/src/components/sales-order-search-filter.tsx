"use client";
import { salesFilterParamsSchema } from "@/hooks/use-sales-filter-params";
import { useAuth } from "@/hooks/use-auth";
import { SearchFilter } from "@gnd/ui/search-filter";
import { _trpc } from "./static-trpc";
import { useQueryStates } from "nuqs";

export function OrderSearchFilter() {
    const [filters, setFilters] = useQueryStates(salesFilterParamsSchema);
    const auth = useAuth();
    console.log(auth?.can);
    return (
        <SearchFilter
            filterSchema={salesFilterParamsSchema}
            placeholder="Search Order Information..."
            trpcRoute={_trpc.filters.salesOrders}
            trpQueryOptions={{
                salesManager: auth?.can?.viewSalesManager,
            }}
            {...{ filters, setFilters }}
        />
    );
}

