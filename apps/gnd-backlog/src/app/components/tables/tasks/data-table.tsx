"use client";
import { useTRPC } from "@/trpc/client";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function DataTable({}) {
  const trpc = useTRPC();
  //   const { filter, hasFilters } = useTaskFi();
  const infiniteQueryOptions = trpc.tasks.get.infiniteQueryOptions(
    {
      //   sort: params.sort,
      //   ...filter,
    },
    {
      getNextPageParam: ({ meta }) => meta?.next,
    },
  );

  const { data, fetchNextPage, hasNextPage, isFetching } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);

  const tableData = useMemo(() => {
    return data?.pages.flatMap((page) => page?.data ?? []) ?? [];
  }, [data]);

  return <div>{JSON.stringify(data)}</div>;
}
