import { _trpc } from "@/components/static-trpc";
import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { useCreateOrderDelivery } from "@/features/sales/api/use-create-order-delivery";
import { useSalesOrderOverview } from "@/features/sales/api/use-sales-order-overview";
import { CreateDeliveryStack } from "@/features/sales/components/create-delivery-stack";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

type Props = {
  orderNo: string;
};

export function SalesOrderDetailScreen({ orderNo }: Props) {
  const router = useRouter();
  const [deliveryOpen, setDeliveryOpen] = useState(false);

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
        <View className="bg-background px-4 pb-2 pt-4">
          <View className="mb-2.5 flex-row items-center gap-3">
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
            <View className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${tone.chip}`}>
              <View className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              <Text className={`text-[10px] font-bold uppercase ${tone.text}`}>
                {saleData?.deliveryStatus || "pending"}
              </Text>
            </View>
          </View>

          <OverviewCard className="border border-border/70 bg-card px-4 pb-4 pt-3">
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
          </OverviewCard>
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
          <View className="gap-4">
            <FinancialOverviewCard
              total={total}
              paid={paid}
              due={due}
              taxAmount={taxAmount}
              discountAmount={discountAmount}
              paidPct={paidPct}
            />

            <ContactOverviewCard
              name={saleData?.displayName || "-"}
              phone={saleData?.customerPhone || "-"}
              email={saleData?.email || "-"}
              billingAddress={saleData?.addressData?.billing}
            />

            <ShippingOverviewCard address={saleData?.addressData?.shipping} />

            <Section title="Activities" icon="Clock">
              {deliveryItems.length ? (
                <View className="gap-2">
                  {deliveryItems.slice(0, 8).map((delivery) => (
                    <View
                      key={delivery.id}
                      className="rounded-2xl border border-border/60 bg-background px-3 py-3"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-foreground">
                          Delivery #{delivery.id}
                        </Text>
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
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-muted-foreground">No activities yet.</Text>
              )}
            </Section>

            <Section title="Items" icon="LayoutGrid">
              {orderItems.length ? (
                <View className="gap-2">
                  {orderItems.map((item) => (
                    <View
                      key={item.uid}
                      className="flex-row items-center gap-3 rounded-2xl border border-border/60 bg-background p-2.5"
                    >
                      {item?.img ? (
                        <Image
                          source={{ uri: item.img }}
                          style={{ width: 56, height: 56, borderRadius: 12 }}
                          contentFit="cover"
                        />
                      ) : (
                        <View className="h-14 w-14 items-center justify-center rounded-xl bg-muted">
                          <Icon name="LayoutGrid" className="text-muted-foreground" size={18} />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-foreground">{item.title}</Text>
                        <Text className="text-xs text-muted-foreground">
                          {item.subtitle || "No subtitle"}
                        </Text>
                      </View>
                      <View className="rounded-full border border-border/70 px-2.5 py-1">
                        <Text className="text-xs font-medium text-muted-foreground">
                          Qty {Number(item?.totalQty?.qty || 0)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-muted-foreground">No items found.</Text>
              )}
            </Section>

            <Section title="Deliveries" icon="Truck">
              {deliveryItems.length ? (
                <View className="gap-2">
                  {deliveryItems.map((delivery) => (
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
                      className="rounded-2xl border border-border/60 bg-background px-3 py-3 active:opacity-80"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-foreground">
                          Delivery #{delivery.id}
                        </Text>
                        <Icon name="ChevronRight" className="text-muted-foreground" size={16} />
                      </View>
                      <Text className="mt-1 text-xs text-muted-foreground">
                        {delivery.status || "queue"}
                        {delivery?.driver?.name ? ` • ${delivery.driver.name}` : ""}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-muted-foreground">No deliveries yet.</Text>
              )}
            </Section>

            <Pressable
              disabled={!saleData?.id}
              onPress={() => setDeliveryOpen(true)}
              className="mb-1 mt-1 h-12 items-center justify-center rounded-xl bg-primary disabled:opacity-50"
            >
              <Text className="text-sm font-semibold text-primary-foreground">Create Delivery</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <CreateDeliveryStack
        visible={deliveryOpen}
        drivers={drivers || []}
        disabled={!saleData?.id}
        isSubmitting={isCreatingDelivery}
        onClose={() => setDeliveryOpen(false)}
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
      chip: "border border-emerald-200 bg-emerald-50",
      text: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    };
  }
  if (value.includes("progress")) {
    return {
      chip: "border border-amber-200 bg-amber-50",
      text: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    };
  }
  return {
    chip: "border border-border bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };
}

function OverviewCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`overflow-hidden rounded-3xl bg-card ${className || "p-4"}`}>
      {children}
    </View>
  );
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
    <View className="rounded-3xl border border-border/70 bg-card p-3">
      <View className="mb-3 flex-row items-center gap-2">
        <View className="rounded-full bg-muted p-1.5">
          <Icon name={icon} className="text-foreground" size={14} />
        </View>
        <Text className="text-sm font-bold text-foreground">{title}</Text>
      </View>
      <View className="rounded-2xl bg-background p-3">{children}</View>
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
    <View className="flex-1 rounded-xl border border-border/60 bg-background px-2.5 py-2">
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

function FinancialOverviewCard({
  total,
  paid,
  due,
  taxAmount,
  discountAmount,
  paidPct,
}: {
  total: number;
  paid: number;
  due: number;
  taxAmount: number;
  discountAmount: number;
  paidPct: number;
}) {
  return (
    <OverviewCard className="border border-border/70 p-4">
      <View className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/10" />
      <View className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-secondary/60" />

      <View className="mb-3 flex-row items-center gap-2">
        <View className="rounded-full bg-primary/10 p-1.5">
          <Icon name="Wallet" className="text-primary" size={14} />
        </View>
        <Text className="text-sm font-bold text-foreground">Financial</Text>
      </View>

      <View className="mb-3 rounded-2xl border border-border/60 bg-background p-3">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Outstanding Balance
          </Text>
          <Text className="text-[11px] font-semibold text-muted-foreground">
            {paidPct.toFixed(0)}% paid
          </Text>
        </View>
        <Text className="text-2xl font-black text-foreground">{money(due)}</Text>
        <View className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <View className="h-full rounded-full bg-primary" style={{ width: `${paidPct}%` }} />
        </View>
      </View>

      <View className="mb-2 flex-row gap-2">
        <View className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2.5">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Total
          </Text>
          <Text className="mt-1 text-sm font-bold text-foreground">{money(total)}</Text>
        </View>
        <View className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Paid
          </Text>
          <Text className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {money(paid)}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <View className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2.5">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tax
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">{money(taxAmount)}</Text>
        </View>
        <View className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2.5">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Discount
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">{money(discountAmount)}</Text>
        </View>
      </View>
    </OverviewCard>
  );
}

function ContactOverviewCard({
  name,
  phone,
  email,
  billingAddress,
}: {
  name: string;
  phone: string;
  email: string;
  billingAddress?: {
    lines?: string[];
    address?: string;
  } | null;
}) {
  const billingLines = (billingAddress?.lines || []).filter(Boolean);

  return (
    <OverviewCard className="border border-border/70 p-4">
      <View className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/15" />
      <View className="absolute -left-8 -bottom-8 h-20 w-20 rounded-full bg-secondary/70" />

      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-primary/10 p-1.5">
            <Icon name="User" className="text-primary" size={14} />
          </View>
          <Text className="text-sm font-bold text-foreground">Customer Contact</Text>
        </View>
        <View className="rounded-full border border-border/70 bg-background px-2.5 py-1">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Billing Source
          </Text>
        </View>
      </View>

      <View className="mb-3 rounded-2xl border border-border/60 bg-background p-3">
        <View className="flex-row items-center gap-2">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/15">
            <Icon name="User" className="text-primary" size={18} />
          </View>
          <View>
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Primary Contact
            </Text>
            <Text className="text-base font-black text-foreground">{name}</Text>
          </View>
        </View>
      </View>

      <View className="gap-2">
        <View className="rounded-xl border border-border/60 bg-background px-3 py-2.5">
          <View className="flex-row items-center gap-2">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-secondary">
              <Icon name="Phone" className="text-muted-foreground" size={13} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Phone
              </Text>
              <Text className="text-sm font-semibold text-foreground">{phone}</Text>
            </View>
          </View>
        </View>
        <View className="rounded-xl border border-border/60 bg-background px-3 py-2.5">
          <View className="flex-row items-center gap-2">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-secondary">
              <Icon name="Mail" className="text-muted-foreground" size={13} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Email
              </Text>
              <Text className="text-sm font-semibold text-foreground">{email}</Text>
            </View>
          </View>
        </View>
        <View className="rounded-xl border border-border/60 bg-background px-3 py-2.5">
          <View className="flex-row items-start gap-2">
            <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-secondary">
              <Icon name="MapPin" className="text-muted-foreground" size={13} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Billing Address
              </Text>
              {billingLines.length ? (
                <View className="mt-0.5 gap-0.5">
                  {billingLines.map((line, index) => (
                    <Text key={`${line}-${index}`} className="text-sm font-semibold text-foreground">
                      {line}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text className="text-sm font-semibold text-foreground">
                  {billingAddress?.address || "No billing address"}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </OverviewCard>
  );
}

function ShippingOverviewCard({ address }: { address?: any }) {
  const lines = (address?.lines || []).filter(Boolean);

  return (
    <OverviewCard className="border border-border/70 p-4">
      <View className="absolute -left-10 -top-10 h-24 w-24 rounded-full bg-primary/15" />
      <View className="absolute -right-8 -bottom-8 h-20 w-20 rounded-full bg-secondary/70" />

      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-primary/10 p-1.5">
            <Icon name="Truck" className="text-primary" size={14} />
          </View>
          <Text className="text-sm font-bold text-foreground">Shipping Destination</Text>
        </View>
        <View className="rounded-full border border-border/70 bg-background px-2.5 py-1">
          <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Active
          </Text>
        </View>
      </View>

      {lines.length ? (
        <View className="gap-2 rounded-2xl border border-border/60 bg-background p-3">
          {lines.map((line: string, index: number) => (
            <View
              key={String(index)}
              className="flex-row items-start gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5"
            >
              <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                <Icon name="MapPin" className="text-primary" size={12} />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {index === 0 ? "Street" : "Address Line"}
                </Text>
                <Text className="text-sm font-semibold text-foreground">{line}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className="rounded-xl border border-dashed border-border bg-background px-3 py-4">
          <View className="flex-row items-center gap-2">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-muted">
              <Icon name="MapPin" className="text-muted-foreground" size={12} />
            </View>
            <Text className="text-sm text-muted-foreground">No shipping address.</Text>
          </View>
        </View>
      )}
    </OverviewCard>
  );
}
