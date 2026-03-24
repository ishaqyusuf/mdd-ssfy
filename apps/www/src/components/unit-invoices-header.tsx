"use client";

import { unitInvoiceFilterParams } from "@/hooks/use-unit-invoices-filter-params";
import { useTRPC } from "@/trpc/client";
import { SearchFilter } from "@gnd/ui/search-filter";
import { useQueryStates } from "nuqs";

export function UnitInvoicesHeader() {
  const trpc = useTRPC();
  const [filters, setFilters] = useQueryStates(unitInvoiceFilterParams);

  return (
    <div className="flex justify-between gap-4">
      <SearchFilter
        filterSchema={unitInvoiceFilterParams}
        placeholder="Search unit invoices..."
        trpcRoute={trpc.filters.projectUnit}
        {...{ filters, setFilters }}
      />
    </div>
  );
}
