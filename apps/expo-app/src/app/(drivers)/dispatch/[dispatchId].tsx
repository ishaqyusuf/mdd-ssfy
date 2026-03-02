import { DispatchDetailScreen } from "@/features/dispatch/components/dispatch-detail-screen";
import { useLocalSearchParams } from "expo-router";

export default function DriverDispatchDetailRoute() {
  const params = useLocalSearchParams<{
    dispatchId?: string;
    salesNo?: string;
  }>();

  const dispatchId = Number(params.dispatchId || 0);
  const salesNo =
    typeof params.salesNo === "string" && params.salesNo.length > 0
      ? params.salesNo
      : undefined;

  return <DispatchDetailScreen dispatchId={dispatchId} salesNo={salesNo} />;
}
