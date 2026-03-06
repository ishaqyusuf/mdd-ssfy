import { _trpc } from "@/components/static-trpc";
import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { useModal } from "@/components/ui/modal";
import { useCreateOrderDelivery } from "@/features/sales/api/use-create-order-delivery";
import { useSalesOrderOverview } from "@/features/sales/api/use-sales-order-overview";
import { CreateDeliveryModal } from "@/features/sales/components/create-delivery-modal";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

type Props = {
  orderNo: string;
};

export function SalesOrderDetailScreen({ orderNo }: Props) {
  const router = useRouter();
  const deliveryModal = useModal();

  const { sale, dispatch } = useSalesOrderOverview(orderNo);
  const { data: drivers } = useQuery(_trpc.hrm.getDrivers.queryOptions({}));

  const saleData = sale.data as any;
  const dispatchData = dispatch.data as any;

  const { mutate: createDelivery, isPending: isCreatingDelivery } =
    useCreateOrderDelivery((dispatchId) => {
      deliveryModal.dismiss();
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

  const paid = Number(saleData?.invoice?.paid || 0);
  const total = Number(saleData?.invoice?.total || 0);
  const due = Number(saleData?.invoice?.pending || 0);
  const paidPct = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;

  if (sale.isPending || dispatch.isPending) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator />
        </View>
      </SafeArea>
    );
  }

  const tone = statusTone(saleData?.deliveryStatus);

  return (
    <SafeArea>
      <View className="flex-1 bg-background">
        <View className="border-b border-border/70 bg-background px-4 pb-4 pt-4">
          <View className="mb-3 flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
            >
              <Icon name="ArrowLeft" className="text-foreground" size={20} />
            </Pressable>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">Order #{saleData?.orderId}</Text>
              <Text className="text-xs text-muted-foreground">Sales order overview</Text>
            </View>
            <View
              className={`flex-row items-center gap-1 rounded-full border px-2.5 py-1 ${tone.chip}`}
            >
              <View className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              <Text className={`text-[10px] font-bold uppercase ${tone.text}`}>
                {saleData?.deliveryStatus || "pending"}
              </Text>
            </View>
          </View>

          <View className="overflow-hidden rounded-3xl border border-border bg-card px-4 pb-4 pt-3">
            <View className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10" />
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {saleData?.displayName || "Customer"}
            </Text>
            <View className="mt-3 flex-row gap-2">
              <MetricPill label="Total" value={money(total)} icon="ReceiptText" />
              <MetricPill label="Paid" value={money(paid)} icon="CircleDollarSign" />
              <MetricPill label="Due" value={money(due)} icon="Wallet" />
            </View>
            <View className="mt-3">
              <View className="mb-1.5 flex-row items-center justify-between">
                <Text className="text-[11px] text-muted-foreground">Payment Progress</Text>
                <Text className="text-[11px] font-semibold text-foreground">{paidPct.toFixed(0)}%</Text>
              </View>
              <View className="h-1.5 overflow-hidden rounded-full bg-muted">
                <View className="h-full rounded-full bg-primary" style={{ width: `${paidPct}%` }} />
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 28,
          }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          scrollEnabled
          bounces
          alwaysBounceVertical
          scrollEventThrottle={16}
        >
          <Section title="Financial" icon="Wallet">
            <GridStat label="Cost" value={money(total)} />
            <GridStat label="Paid" value={money(paid)} />
            <GridStat label="Tax" value={money(taxAmount)} />
            <GridStat label="Discount" value={money(discountAmount)} />
            <GridStat label="Balance" value={money(due)} />
          </Section>

          <Section title="Contact" icon="User">
            <InfoRow label="Name" value={saleData?.displayName || "-"} icon="User" />
            <InfoRow label="Phone" value={saleData?.customerPhone || "-"} icon="Phone" />
            <InfoRow label="Email" value={saleData?.email || "-"} icon="Mail" />
          </Section>

          <Section title="Shipping" icon="Truck">
            <AddressBlock address={saleData?.addressData?.shipping} />
          </Section>

          <Section title="Billing" icon="ReceiptText">
            <AddressBlock address={saleData?.addressData?.billing} />
          </Section>

          <Section title="Activities" icon="Clock">
            {deliveryItems.length ? (
              deliveryItems.slice(0, 8).map((delivery) => (
                <View
                  key={delivery.id}
                  className="mb-2 rounded-2xl border border-border bg-background px-3 py-3"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-foreground">Delivery #{delivery.id}</Text>
                    <Text className="text-xs uppercase text-muted-foreground">
                      {delivery.status || "queue"}
                    </Text>
                  </View>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {delivery.dueDate
                      ? new Date(delivery.dueDate).toDateString()
                      : "No due date"}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-sm text-muted-foreground">No activities yet.</Text>
            )}
          </Section>

          <Section title="Items" icon="LayoutGrid">
            {orderItems.length ? (
              orderItems.map((item) => (
                <View
                  key={item.uid}
                  className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border bg-background p-2.5"
                >
                  {item?.img ? (
                    <Image
                      source={{ uri: item.img }}
                      style={{ width: 56, height: 56, borderRadius: 12 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="h-14 w-14 items-center justify-center rounded-xl border border-border bg-card">
                      <Icon name="LayoutGrid" className="text-muted-foreground" size={18} />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">{item.title}</Text>
                    <Text className="text-xs text-muted-foreground">
                      {item.subtitle || "No subtitle"}
                    </Text>
                  </View>
                  <View className="rounded-full border border-border px-2.5 py-1">
                    <Text className="text-xs font-medium text-muted-foreground">
                      Qty {Number(item?.totalQty?.qty || 0)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-sm text-muted-foreground">No items found.</Text>
            )}
          </Section>

          <Section title="Deliveries" icon="Truck">
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
                  className="mb-2 rounded-2xl border border-border bg-background px-3 py-3 active:opacity-80"
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

          <Pressable
            disabled={!saleData?.id}
            onPress={deliveryModal.present}
            className="mb-2 mt-1 h-12 items-center justify-center rounded-xl bg-primary disabled:opacity-50"
          >
            <Text className="text-sm font-semibold text-primary-foreground">Create Delivery</Text>
          </Pressable>
        </ScrollView>
      </View>

      <CreateDeliveryModal
        ref={deliveryModal.ref}
        drivers={drivers || []}
        disabled={!saleData?.id}
        isSubmitting={isCreatingDelivery}
        onCancel={deliveryModal.dismiss}
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
    </SafeArea>
  );
}

function money(value?: number | null) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function statusTone(status?: string | null) {
  const value = String(status || "").toLowerCase();
  if (value.includes("completed")) {
    return {
      chip: "border-emerald-300 bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    };
  }
  if (value.includes("progress")) {
    return {
      chip: "border-amber-300 bg-amber-500/10",
      text: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    };
  }
  return {
    chip: "border-border bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 overflow-hidden rounded-3xl border border-border bg-card p-4">
      <View className="mb-3 flex-row items-center gap-2">
        <View className="rounded-full bg-secondary p-1.5">
          <Icon name={icon} className="text-foreground" size={14} />
        </View>
        <Text className="text-sm font-bold text-foreground">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function MetricPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <View className="flex-1 rounded-xl border border-border bg-background px-2.5 py-2">
      <View className="mb-1 flex-row items-center gap-1.5">
        <Icon name={icon} className="text-muted-foreground" size={12} />
        <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Text>
      </View>
      <Text className="text-xs font-bold text-foreground">{value}</Text>
    </View>
  );
}

function GridStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 flex-row items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
      <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
      <Text className="text-sm font-semibold text-foreground">{value}</Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <View className="mb-2 flex-row items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
      <Icon name={icon} className="text-muted-foreground" size={14} />
      <View className="flex-1">
        <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Text>
        <Text className="text-sm font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}

function AddressBlock({ address }: { address?: any }) {
  const lines = (address?.lines || []).filter(Boolean);
  if (!lines.length) {
    return <Text className="text-sm text-muted-foreground">No address.</Text>;
  }
  return (
    <View className="gap-2">
      {lines.map((line: string, index: number) => (
        <View
          key={String(index)}
          className="flex-row items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5"
        >
          <Icon name="MapPin" className="text-muted-foreground" size={14} />
          <Text className="flex-1 text-sm text-foreground">{line}</Text>
        </View>
      ))}
    </View>
  );
}
