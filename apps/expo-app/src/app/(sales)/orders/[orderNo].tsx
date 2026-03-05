import { SalesOrderDetailScreen } from "@/features/sales/components/sales-order-detail-screen";
import { useLocalSearchParams } from "expo-router";

export default function SalesOrderDetailRoute() {
  const params = useLocalSearchParams<{ orderNo?: string }>();
  const orderNo = typeof params.orderNo === "string" ? params.orderNo : "";

  return <SalesOrderDetailScreen orderNo={orderNo} />;
}
