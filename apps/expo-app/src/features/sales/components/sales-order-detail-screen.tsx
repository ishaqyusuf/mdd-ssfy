import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { useCreateOrderDelivery } from "@/features/sales/api/use-create-order-delivery";
import { useSalesOrderOverview } from "@/features/sales/api/use-sales-order-overview";
import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

type Props = {
  orderNo: string;
};

export function SalesOrderDetailScreen({ orderNo }: Props) {
  const router = useRouter();
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "pickup">("delivery");
  const [deliveryStatus, setDeliveryStatus] = useState<
    "queue" | "in progress" | "completed"
  >("queue");
  const [driverId, setDriverId] = useState<number | undefined>(undefined);

  const { sale, dispatch } = useSalesOrderOverview(orderNo);
  const { data: drivers } = useQuery(_trpc.hrm.getDrivers.queryOptions({}));

  const saleData = sale.data as any;
  const dispatchData = dispatch.data as any;

  const { mutate: createDelivery, isPending: isCreatingDelivery } =
    useCreateOrderDelivery((dispatchId) => {
      setDeliveryOpen(false);
      router.push({
        pathname: "/(sales)/orders/[orderNo]/delivery/[dispatchId]",
        params: {
          orderNo,
          dispatchId: String(dispatchId),
        },
      } as any);
    });

  const taxAmount = useMemo(() => {
    const lines = saleData?.costLines || [];
    return lines
      .filter((line) => String(line?.label || "").toLowerCase().includes("tax"))
      .reduce((acc, line) => acc + Number(line?.amount || 0), 0);
  }, [saleData?.costLines]);

  const discountAmount = useMemo(() => {
    const lines = saleData?.costLines || [];
    return lines
      .filter((line) =>
        String(line?.label || "").toLowerCase().includes("discount"),
      )
      .reduce((acc, line) => acc + Number(line?.amount || 0), 0);
  }, [saleData?.costLines]);

  const deliveryItems = dispatchData?.deliveries || [];
  const orderItems = dispatchData?.dispatchables || [];

  if (sale.isPending || dispatch.isPending) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator />
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <View className="flex-1 bg-background px-4 pt-4">
        <View className="mb-4 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
          >
            <Icon name="ArrowLeft" className="text-foreground" size={20} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">Order #{saleData?.orderId}</Text>
            <Text className="text-sm text-muted-foreground">Sales order details</Text>
          </View>
          <View className="rounded-full border border-border px-2 py-1">
            <Text className="text-xs font-semibold text-muted-foreground">
              {saleData?.deliveryStatus || "N/A"}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <Section title="Financial">
            <Row label="Cost" value={`$${Number(saleData?.invoice?.total || 0).toFixed(2)}`} />
            <Row label="Paid" value={`$${Number(saleData?.invoice?.paid || 0).toFixed(2)}`} />
            <Row label="Tax" value={`$${taxAmount.toFixed(2)}`} />
            <Row label="Discount" value={`$${discountAmount.toFixed(2)}`} />
            <Row label="Balance" value={`$${Number(saleData?.invoice?.pending || 0).toFixed(2)}`} />
          </Section>

          <Section title="Contact">
            <Row label="Name" value={saleData?.displayName || "-"} />
            <Row label="Phone" value={saleData?.customerPhone || "-"} />
            <Row label="Email" value={saleData?.email || "-"} />
          </Section>

          <Section title="Shipping">
            <AddressBlock address={saleData?.addressData?.shipping} />
          </Section>

          <Section title="Billing">
            <AddressBlock address={saleData?.addressData?.billing} />
          </Section>

          <Section title="Activities">
            {deliveryItems.length ? (
              deliveryItems.slice(0, 8).map((delivery) => (
                <View
                  key={delivery.id}
                  className="mb-2 rounded-xl border border-border bg-background px-3 py-2"
                >
                  <Text className="text-sm font-semibold text-foreground">
                    Delivery #{delivery.id}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {delivery.status || "queue"} {delivery.dueDate ? `• ${new Date(delivery.dueDate).toDateString()}` : ""}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-sm text-muted-foreground">No activities yet.</Text>
            )}
          </Section>

          <Section title="Items">
            {orderItems.length ? (
              orderItems.map((item) => (
                <View
                  key={item.uid}
                  className="mb-2 flex-row items-center gap-3 rounded-xl border border-border bg-background p-2"
                >
                  {item?.img ? (
                    <Image
                      source={{ uri: item.img }}
                      style={{ width: 52, height: 52, borderRadius: 10 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="h-[52px] w-[52px] items-center justify-center rounded-xl border border-border bg-card">
                      <Icon name="Package" className="text-muted-foreground" size={16} />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">{item.title}</Text>
                    <Text className="text-xs text-muted-foreground">
                      {item.subtitle || "No subtitle"}
                    </Text>
                  </View>
                  <View className="rounded-full border border-border px-2 py-1">
                    <Text className="text-xs text-muted-foreground">
                      Qty {Number(item?.totalQty?.qty || 0)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-sm text-muted-foreground">No items found.</Text>
            )}
          </Section>

          <Section title="Deliveries">
            {deliveryItems.length ? (
              deliveryItems.map((delivery) => (
                <Pressable
                  key={delivery.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(sales)/orders/[orderNo]/delivery/[dispatchId]",
                      params: {
                        orderNo,
                        dispatchId: String(delivery.id),
                      },
                    } as any)
                  }
                  className="mb-2 rounded-xl border border-border bg-background px-3 py-3 active:opacity-80"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-foreground">Delivery #{delivery.id}</Text>
                    <Icon name="ChevronRight" className="text-muted-foreground" size={16} />
                  </View>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {delivery.status || "queue"}
                    {delivery?.driver?.name ? ` • ${delivery.driver.name}` : ""}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text className="text-sm text-muted-foreground">No deliveries yet.</Text>
            )}
          </Section>
        </ScrollView>

        <View className="absolute bottom-8 left-4 right-4">
          <Pressable
            disabled={!saleData?.id}
            onPress={() => setDeliveryOpen(true)}
            className="h-12 items-center justify-center rounded-xl bg-primary disabled:opacity-50"
          >
            <Text className="text-sm font-semibold text-primary-foreground">Create Delivery</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={deliveryOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDeliveryOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl border border-border bg-background px-4 pb-6 pt-3">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-foreground">Create Delivery</Text>
              <Pressable onPress={() => setDeliveryOpen(false)}>
                <Icon name="X" className="text-foreground" size={20} />
              </Pressable>
            </View>

            <Text className="mb-2 text-xs font-semibold text-muted-foreground">Delivery Mode</Text>
            <View className="mb-3 flex-row gap-2">
              {(["delivery", "pickup"] as const).map((mode) => {
                const active = deliveryMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => setDeliveryMode(mode)}
                    className={`rounded-full border px-3 py-2 ${
                      active ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <Text className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                      {mode}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mb-2 text-xs font-semibold text-muted-foreground">Status</Text>
            <View className="mb-3 flex-row gap-2">
              {(["queue", "in progress", "completed"] as const).map((status) => {
                const active = deliveryStatus === status;
                return (
                  <Pressable
                    key={status}
                    onPress={() => setDeliveryStatus(status)}
                    className={`rounded-full border px-3 py-2 ${
                      active ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <Text className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                      {status}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mb-2 text-xs font-semibold text-muted-foreground">Assign Driver</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setDriverId(undefined)}
                  className={`rounded-full border px-3 py-2 ${
                    !driverId ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <Text className={`text-xs font-semibold ${!driverId ? "text-primary" : "text-foreground"}`}>
                    Unassigned
                  </Text>
                </Pressable>
                {(drivers || []).map((driver) => {
                  const active = driverId === driver.id;
                  return (
                    <Pressable
                      key={driver.id}
                      onPress={() => setDriverId(driver.id)}
                      className={`rounded-full border px-3 py-2 ${
                        active ? "border-primary bg-primary/10" : "border-border"
                      }`}
                    >
                      <Text className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                        {driver.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setDeliveryOpen(false)}
                className="h-11 flex-1 items-center justify-center rounded-xl border border-border"
              >
                <Text className="text-sm font-semibold text-foreground">Cancel</Text>
              </Pressable>
              <Pressable
                disabled={isCreatingDelivery || !saleData?.id}
                onPress={() => {
                  createDelivery({
                    salesId: Number(saleData.id),
                    deliveryMode,
                    status: deliveryStatus,
                    dueDate: new Date(),
                    driverId: driverId ? String(driverId) : undefined,
                  } as any);
                }}
                className="h-11 flex-1 items-center justify-center rounded-xl bg-primary disabled:opacity-50"
              >
                <Text className="text-sm font-semibold text-primary-foreground">
                  {isCreatingDelivery ? "Creating..." : "Create Delivery"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeArea>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4 rounded-2xl border border-border bg-card p-4">
      <Text className="mb-2 text-sm font-semibold text-foreground">{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className="text-sm font-semibold text-foreground">{value}</Text>
    </View>
  );
}

function AddressBlock({ address }: { address?: any }) {
  const lines = (address?.lines || []).filter(Boolean);
  if (!lines.length) {
    return <Text className="text-sm text-muted-foreground">No address.</Text>;
  }
  return (
    <View className="gap-1">
      {lines.map((line: string, index: number) => (
        <Text key={String(index)} className="text-sm text-foreground">
          {line}
        </Text>
      ))}
    </View>
  );
}
