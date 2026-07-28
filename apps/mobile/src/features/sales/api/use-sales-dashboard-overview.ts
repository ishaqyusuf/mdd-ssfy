import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";

export function useSalesDashboardOverview() {
  return useQuery(_trpc.sales.mobileDashboardOverview.queryOptions());
}
