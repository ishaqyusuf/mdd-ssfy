"use client";

import { unitProductionFilterParams } from "@/hooks/use-unit-productions-filter-params";
import { useTRPC } from "@/trpc/client";
import { SearchFilter } from "@gnd/ui/search-filter";
import { useQueryStates } from "nuqs";

export function UnitProductionsHeader() {
  const trpc = useTRPC();
  const [filters, setFilters] = useQueryStates(unitProductionFilterParams);

  return (
    <div className="flex justify-between gap-4">
      <SearchFilter
        filterSchema={unitProductionFilterParams}
        placeholder="Search unit productions..."
        trpcRoute={trpc.filters.unitProduction}
        {...{ filters, setFilters }}
      />
    </div>
  );
}
