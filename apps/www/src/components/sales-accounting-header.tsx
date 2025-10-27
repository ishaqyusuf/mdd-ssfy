"use client";
import { SearchFilter } from "@gnd/ui/search-filter";

import { salesAccountingFilterParams } from "@/hooks/use-sales-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import Link from "next/link";
import { cn } from "@gnd/ui/cn";
import { buttonVariants } from "@gnd/ui/button";
import { useQueryStates } from "nuqs";

export function SalesAccountingHeader({}) {
    const trpc = useTRPC();
    const [filters, setFilters] = useQueryStates(salesAccountingFilterParams);
    return (
        <div className="flex justify-between">
            <SearchFilter
                filterSchema={salesAccountingFilterParams}
                placeholder="Search SalesAccountings..."
                trpcRoute={trpc.filters.salesAccounting}
                {...{ filters, setFilters }}
            />
            <div className="flex-1"></div>
            <Link
                href="/sales-book/accounting/resolution-center"
                className={cn(buttonVariants({}))}
            >
                Resolution Center
            </Link>
        </div>
    );
}

