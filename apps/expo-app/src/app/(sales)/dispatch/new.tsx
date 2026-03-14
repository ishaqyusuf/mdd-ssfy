import { SalesOrdersListScreen } from "@/features/sales/components/sales-orders-list-screen";
import { useRouter } from "expo-router";

export default function SalesDispatchSearchRoute() {
  const router = useRouter();

  return (
    <SalesOrdersListScreen
      mode="dispatch-search"
      title="New Dispatch"
      subtitle="Search order and create delivery"
      onSalesOrderPress={(item) => {
        router.push({
          pathname: "/(sales)/orders/[orderNo]/delivery/create",
          params: { orderNo: item.orderId },
        } as any);
      }}
    />
  );
}
