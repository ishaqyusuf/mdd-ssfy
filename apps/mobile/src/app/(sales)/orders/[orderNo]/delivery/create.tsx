import { CreateDeliveryModalScreen } from "@/features/sales/components/create-delivery-modal-screen";
import { useLocalSearchParams } from "expo-router";

export default function CreateSalesOrderDeliveryRoute() {
  const params = useLocalSearchParams<{
    orderNo?: string;
  }>();

  const orderNo = typeof params.orderNo === "string" ? params.orderNo : "";

  return <CreateDeliveryModalScreen orderNo={orderNo} />;
}
