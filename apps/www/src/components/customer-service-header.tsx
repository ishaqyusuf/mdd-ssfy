"use client";

import { customerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { useTRPC } from "@/trpc/client";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";
import { OpenCustomerServiceSheet } from "./open-customer-service-sheet";

export function CustomerServiceHeader() {
    const trpc = useTRPC();

    return (
        <div className="flex justify-between">
            <SearchFilter
                filterSchema={customerServiceFilterParams}
                placeholder="Search CustomerServices..."
                trpcRoute={trpc.filters.customerService}
            />
            <div className="flex-1" />
            <OpenCustomerServiceSheet />
        </div>
    );
}
