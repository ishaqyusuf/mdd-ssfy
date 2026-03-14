import { SafeArea } from "@/components/safe-area";
import { useCreateOrderDelivery } from "@/features/sales/api/use-create-order-delivery";
import { useSalesOrderOverview } from "@/features/sales/api/use-sales-order-overview";
import { useQuery } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { CreateDeliveryStack } from "./create-delivery-stack";

type Props = {
  orderNo: string;
};

export function CreateDeliveryModalScreen({ orderNo }: Props) {
  const router = useRouter();
  const { sale } = useSalesOrderOverview(orderNo);
  const { data: drivers } = useQuery(_trpc.hrm.getDrivers.queryOptions({}));
  const saleData = sale.data as any;

  const { mutate: createDelivery, isPending: isCreatingDelivery } =
    useCreateOrderDelivery((dispatchId) => {
      router.replace({
        pathname: "/(sales)/orders/[orderNo]/delivery/[dispatchId]",
        params: {
          orderNo,
          dispatchId: String(dispatchId),
        },
      } as any);
    });

  if (sale.isPending) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator />
        </View>
      </SafeArea>
    );
  }

  if (!saleData?.id) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center bg-background px-6">
          <Text className="text-center text-sm text-muted-foreground">
            Unable to load order for delivery creation.
          </Text>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <View className="flex-1 bg-background">
        <CreateDeliveryStack
          visible
          drivers={drivers || []}
          disabled={!saleData?.id}
          isSubmitting={isCreatingDelivery}
          onClose={() => router.back()}
          onSubmit={({ deliveryMode, status, dueDate, driverId }) => {
            createDelivery({
              salesId: Number(saleData.id),
              deliveryMode,
              status,
              dueDate,
              driverId: driverId ? String(driverId) : undefined,
            } as any);
          }}
        />
      </View>
    </SafeArea>
  );
}
