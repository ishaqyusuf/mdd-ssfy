"use client";
import { SearchFilter } from "@gnd/ui/search-filter";
import { OpenCustomerServiceSheet } from "./open-customer-service-sheet";
import { customerServiceFilterParams } from "@/hooks/use-customer-service-filter-params";
import { useQueryStates } from "nuqs";
import { _trpc } from "./static-trpc";

export function CustomerServiceHeader({}) {
    const [filters, setFilters] = useQueryStates(customerServiceFilterParams);
    return (
        <div className="flex justify-between">
            <SearchFilter
                filterSchema={customerServiceFilterParams}
                placeholder="Search CustomerServices..."
                trpcRoute={_trpc.filters.customerService}
                {...{ filters, setFilters }}
            />
            <div className="flex-1"></div>
            <OpenCustomerServiceSheet />
        </div>
    );
}

