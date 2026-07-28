import { DispatchDetailScreen } from "@/features/dispatch/components/dispatch-detail-screen";
import { useLocalSearchParams } from "expo-router";

export default function SalesOrderDeliveryDetailRoute() {
  const params = useLocalSearchParams<{
    orderNo?: string;
    dispatchId?: string;
    openComplete?: string;
  }>();

  const dispatchId = Number(params.dispatchId || 0);
  const salesNo = typeof params.orderNo === "string" ? params.orderNo : undefined;
  const openComplete =
    params.openComplete === "1" || params.openComplete === "true";

  return (
    <DispatchDetailScreen
      dispatchId={dispatchId}
      salesNo={salesNo}
      openCompleteOnMount={openComplete}
    />
  );
}
