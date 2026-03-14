import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useSalesOrderFilters } from "@/features/sales/api/use-sales-order-filters";
import { useSalesOrdersList } from "@/features/sales/api/use-sales-orders-list";
import type { FilterItem } from "@/features/sales/types/sales.types";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  View,
} from "react-native";
import { OrdersFilterModal } from "./orders-filter-modal";
import { SalesOrderCard } from "./sales-order-card";

type SalesOrdersListMode = "default" | "dispatch-search";

type SalesOrdersListScreenProps = {
  title?: string;
  subtitle?: string;
  mode?: SalesOrdersListMode;
  onSalesOrderPress?: (item: any) => void;
};

export function SalesOrdersListScreen({
  title = "Orders",
  subtitle = "Search and filter sales orders",
  mode = "default",
  onSalesOrderPress,
}: SalesOrdersListScreenProps = {}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string | null | undefined>
  >({});

  const { data: rawFilters } = useSalesOrderFilters();
  const filters = useMemo(() => (rawFilters || []) as FilterItem[], [rawFilters]);

  const { data, isPending, isRefetching, refetch } = useSalesOrdersList({
    q: search,
    filters: selectedFilters,
  });

  const items = (data as any)?.data || [];
  const isDispatchSearchMode = mode === "dispatch-search";

  return (
    <SafeArea>
      <View className="flex-1 bg-background pt-4">
        <View className="px-4">
          <View className="mb-4 flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
            >
              <Icon name="ArrowLeft" className="text-foreground" size={20} />
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-foreground">{title}</Text>
              <Text className="text-sm text-muted-foreground">{subtitle}</Text>
            </View>
          </View>

          <View className="mb-4 flex-row items-center gap-2">
            <View className="h-12 flex-1 flex-row items-center rounded-xl border border-border bg-card px-3">
              <Icon name="Search" className="text-muted-foreground" size={18} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search order, customer, phone, PO"
                placeholderTextColor="#8A8A8A"
                className="ml-2 flex-1 text-foreground"
              />
            </View>
            {!isDispatchSearchMode ? (
              <Pressable
                onPress={() => setFilterOpen(true)}
                className="h-12 w-12 items-center justify-center rounded-xl border border-border bg-card active:opacity-80"
              >
                <Icon name="SlidersHorizontal" className="text-foreground" size={18} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ListEmptyComponent={
              <View className="mt-8 items-center rounded-xl border border-dashed border-border p-8">
                <Text className="text-base font-semibold text-foreground">No orders found</Text>
                <Text className="mt-2 text-center text-sm text-muted-foreground">
                  Adjust search or filters and try again.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <SalesOrderCard
                item={item}
                onPress={() => {
                  if (onSalesOrderPress) {
                    onSalesOrderPress(item);
                    return;
                  }
                  router.push({
                    pathname: "/(sales)/orders/[orderNo]",
                    params: { orderNo: item.orderId },
                  } as any);
                }}
              />
            )}
          />
        )}
      </View>

      {!isDispatchSearchMode ? (
        <OrdersFilterModal
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          filters={filters.filter((f) => f.value !== "q")}
          selected={selectedFilters}
          onApply={(next) => setSelectedFilters(next)}
        />
      ) : null}
    </SafeArea>
  );
}
