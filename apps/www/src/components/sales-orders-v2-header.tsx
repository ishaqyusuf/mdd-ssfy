"use client";

import { Icons } from "@gnd/ui/icons";

import Link from "next/link";
import { SearchFilter } from "@gnd/ui/search-filter";
import { useQueryStates } from "nuqs";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { salesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { CreateSalesBtn } from "./create-sales-btn";

export function SalesOrdersV2Header() {
  const trpc = useTRPC();
  const [filters, setFilters] = useQueryStates(salesOrdersV2FilterParams);

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
      <div className="min-w-0 flex-1">
        <SearchFilter
          filterSchema={salesOrdersV2FilterParams}
          placeholder="Search order number, customer, phone, address, or P.O..."
          trpcRoute={trpc.filters.salesOrdersV2}
          {...{ filters, setFilters }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/sales-book/orders">
            <Icons.ArrowUpRight className="mr-2 size-4" />
            Legacy
          </Link>
        </Button>
        <CreateSalesBtn />
      </div>
    </div>
  );
}
