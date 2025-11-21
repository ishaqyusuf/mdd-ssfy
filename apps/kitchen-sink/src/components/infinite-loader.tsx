import { useInView } from "react-intersection-observer";
import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
interface Props {
  filter?;
  route;
}
export const useInfiniteLoader = ({ filter, route }: Props) => {
  // const trpc = useTRPC();
  const { ref, inView } = useInView();

  const deferredSearch = useDeferredValue(filter?.q);

  const infiniteQueryOptions = route.infiniteQueryOptions(
    {
      ...(filter || {}),
      q: deferredSearch,
    },
    {
      getNextPageParam: ({ meta }) => {
        return meta?.cursor;
      },
    }
  );
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    refetch,
    isRefetching,
  } = useSuspenseInfiniteQuery(infiniteQueryOptions);
  const tableData = useMemo(() => {
    const list =
      data?.pages.flatMap((page) => {
        return (page as any)?.data ?? [];
      }) ?? [];

    return {
      data: list,
      // resultCount: cursor,
      // total: count,
    };
  }, [data]);

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView]);
  return {
    ref,
    // data: tableData,
    ...tableData,
    queryData: data,
    hasNextPage,
    isFetching,
    refetch,
    isRefetching,
    // from: data?.
  };
};
