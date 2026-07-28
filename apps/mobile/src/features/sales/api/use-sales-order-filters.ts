import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";

export function useSalesOrderFilters() {
  return useQuery(
    _trpc.filters.salesOrders.queryOptions({
      salesManager: true,
    }),
  );
}
