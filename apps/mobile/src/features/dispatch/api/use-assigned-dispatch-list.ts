import { _trpc } from "@/components/static-trpc";
import { useAuthContext } from "@/hooks/use-auth";
import { RouterInputs } from "@api/trpc/routers/_app";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type AssignedDispatchFilter = RouterInputs["dispatch"]["assignedDispatch"];

export function useAssignedDispatchList(filter?: AssignedDispatchFilter) {
  const auth = useAuthContext();
  const authUserId = Number(auth?.profile?.user?.id || 0);

  const normalizedFilter = useMemo(
    () => ({
      size: 20,
      ...(filter || {}),
      ...(!auth?.isAdmin && authUserId
        ? {
            driversId: [authUserId],
          }
        : {}),
    }),
    [filter, auth?.isAdmin, authUserId],
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
