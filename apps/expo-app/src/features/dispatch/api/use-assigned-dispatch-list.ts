import { _trpc } from "@/components/static-trpc";
import { RouterInputs } from "@api/trpc/routers/_app";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type AssignedDispatchFilter = RouterInputs["dispatch"]["assignedDispatch"];

export function useAssignedDispatchList(filter?: AssignedDispatchFilter) {
  const normalizedFilter = useMemo(
    () => ({
      size: 20,
      ...(filter || {}),
    }),
    [filter],
  );

  const query = useInfiniteQuery(
    _trpc.dispatch.assignedDispatch.infiniteQueryOptions(normalizedFilter, {
      getNextPageParam: (lastPage) => lastPage?.meta?.cursor,
    }),
  );

  const items = useMemo(() => {
    return query.data?.pages.flatMap((page) => page?.data ?? []) ?? [];
  }, [query.data]);

  return {
    ...query,
    items,
  };
}
