"use client";
import { SearchFilterProvider } from "@/hooks/use-search-filter";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { SearchFilterTRPC } from "./midday-search-filter/search-filter-trpc";
import { backlogFilterParams } from "@/hooks/use-backlog-filter-params";

export function BacklogSearchFilter() {
  return (
    <SearchFilterProvider
      args={[
        {
          filterSchema: backlogFilterParams,
        },
      ]}
    >
      <Content />
    </SearchFilterProvider>
  );
}

function Content({}) {
  const trpc = useTRPC();
  const { data: trpcFilterData } = useQuery({
    ...trpc.filters.backlog.queryOptions(),
  });

  return (
    <>
      <SearchFilterTRPC
        placeholder={"Search Backlogs..."}
        filterList={trpcFilterData}
      />
    </>
  );
}
