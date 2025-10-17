"use client";
import { SearchFilter } from "@gnd/ui/custom/search-filter/index";
import { OpenBacklogSheet } from "./open-backlog-sheet";
import { useTRPC } from "@/trpc/client";
import { backlogFilterParams } from "@/hooks/use-backlog-filter-params";

export function BacklogsHeader({}) {
  const trpc = useTRPC();
  return (
    <div className="flex justify-between">
      <SearchFilter
        filterSchema={backlogFilterParams}
        placeholder="Search Backlogs..."
        trpcRoute={trpc.filters.backlog}
      />
      {/* <ExampleSearchFilter /> */}
      <div className="flex-1"></div>
      <OpenBacklogSheet />
    </div>
  );
}
