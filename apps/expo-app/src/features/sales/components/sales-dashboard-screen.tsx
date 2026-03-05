import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { useSalesDashboardOverview } from "@/features/sales/api/use-sales-dashboard-overview";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

export function SalesDashboardScreen() {
  const router = useRouter();
  const { data, isPending, refetch, isRefetching } = useSalesDashboardOverview();

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
            <Text className="text-2xl font-bold text-foreground">Sales Dashboard</Text>
            <Text className="text-sm text-muted-foreground">
              Orders and fulfillment overview.
            </Text>
          </View>
        </View>

        {isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 36 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => refetch()}
              />
            }
          >
            <View className="mb-4 flex-row flex-wrap gap-3">
              <StatCard label="Orders" value={data?.orders?.total || 0} />
              <StatCard
                label="Delivery In Progress"
                value={data?.delivery?.inProgress || 0}
              />
              <StatCard
                label="Production In Progress"
                value={data?.production?.inProgress || 0}
              />
              <StatCard
                label="Production Completed"
                value={data?.production?.completed || 0}
              />
            </View>

            <View className="gap-3">
              <Pressable
                onPress={() => router.push("/(sales)/orders" as any)}
                className="rounded-2xl border border-border bg-card p-4 active:opacity-80"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="rounded-full bg-primary/10 p-2">
                      <Icon name="ClipboardList" className="text-primary" size={18} />
                    </View>
                    <View>
                      <Text className="text-base font-semibold text-foreground">Orders</Text>
                      <Text className="text-xs text-muted-foreground">
                        Search and manage deliveries
                      </Text>
                    </View>
                  </View>
                  <Icon name="ChevronRight" className="text-muted-foreground" size={20} />
                </View>
              </Pressable>

              <View className="rounded-2xl border border-border bg-card p-4 opacity-60">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="rounded-full bg-muted p-2">
                      <Icon name="FileText" className="text-muted-foreground" size={18} />
                    </View>
                    <View>
                      <Text className="text-base font-semibold text-foreground">Quotes</Text>
                      <Text className="text-xs text-muted-foreground">Coming soon</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View className="mt-5">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-base font-bold text-foreground">
                  Recent Sales
                </Text>
                <Text className="text-xs font-medium text-muted-foreground">
                  Last 10 records
                </Text>
              </View>

              {(data?.recentSales || []).length ? (
                <View className="gap-2">
                  {(data?.recentSales || []).map((sale) => (
                    <RecentSaleItem
                      key={String(sale.id)}
                      sale={sale}
                      onPress={() =>
                        router.push({
                          pathname: "/(sales)/orders/[orderNo]",
                          params: { orderNo: sale.orderId },
                        } as any)
                      }
                    />
                  ))}
                </View>
              ) : (
                <View className="rounded-2xl border border-dashed border-border p-4">
                  <Text className="text-sm text-muted-foreground">
                    No recent sales found.
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={() => refetch()}
              className="mt-6 self-center rounded-full border border-border px-4 py-2 active:opacity-80"
              disabled={isRefetching}
            >
              <Text className="text-xs font-semibold text-foreground">
                {isRefetching ? "Refreshing..." : "Refresh"}
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </SafeArea>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-h-[96px] min-w-[47%] flex-1 rounded-2xl border border-border bg-card p-3">
      <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
      <Text className="mt-2 text-3xl font-bold text-foreground">{value}</Text>
    </View>
  );
}

function RecentSaleItem({
  sale,
  onPress,
}: {
  sale: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-border bg-card px-3.5 py-3 active:opacity-80"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-bold text-foreground">
            #{sale.orderId}
          </Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {sale.customerName || "-"}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-sm font-semibold text-foreground">
            ${Number(sale.total || 0).toFixed(2)}
          </Text>
          <Text className="text-[11px] text-muted-foreground">
            Due ${Number(sale.due || 0).toFixed(2)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
