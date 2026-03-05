import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";

export function useSalesOrderOverview(orderNo: string) {
  const sale = useQuery(
    _trpc.sales.getSaleOverview.queryOptions(
      {
        orderNo,
        salesType: "order",
        showing: "all sales",
      } as any,
      {
        enabled: !!orderNo,
      },
    ),
  );

  const dispatch = useQuery(
    _trpc.dispatch.orderDispatchOverview.queryOptions(
      {
        salesNo: orderNo,
      },
      {
        enabled: !!orderNo,
      },
    ),
  );

  return {
    sale,
    dispatch,
  };
}
