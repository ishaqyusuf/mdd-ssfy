import { useAssignedDispatchList } from "../api/use-assigned-dispatch-list";
import type { DispatchListItem } from "../types/dispatch.types";
import { DriverDashboardDispatchItem } from "./driver-dashboard-dispatch-item";
import { useRouter } from "expo-router";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  View,
} from "react-native";

type FilterKey =
  | "all"
  | "queue"
  | "packed"
  | "in progress"
  | "completed"
  | "cancelled";

function openDispatch(
  router: ReturnType<typeof useRouter>,
  item: DispatchListItem,
  options?: { openComplete?: boolean },
) {
  router.push(
    {
      pathname: "/(drivers)/dispatch/[dispatchId]",
      params: {
        dispatchId: String(item.id),
        salesNo: item?.order?.orderId || "",
        openComplete: options?.openComplete ? "1" : "0",
      },
    } as any,
  );
}

export function DispatchListScreen() {
  const router = useRouter();
  const {
    items,
    refetch,
    isPending,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
  } = useAssignedDispatchList({});
  const canTriggerEndReached = useRef(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => (item?.status || "").toLowerCase() === filter);
  }, [items, filter]);

  const filterOptions = useMemo(
    () => [
      { key: "all" as const, label: "All", count: items.length },
      {
        key: "queue" as const,
        label: "Queued",
        count: items.filter((item) => (item?.status || "").toLowerCase() === "queue").length,
      },
      {
        key: "packed" as const,
        label: "Packed",
        count: items.filter((item) => (item?.status || "").toLowerCase() === "packed").length,
      },
      {
        key: "in progress" as const,
        label: "In Progress",
        count: items.filter((item) => (item?.status || "").toLowerCase() === "in progress").length,
      },
      {
        key: "completed" as const,
        label: "Completed",
        count: items.filter((item) => (item?.status || "").toLowerCase() === "completed").length,
      },
      {
        key: "cancelled" as const,
        label: "Cancelled",
        count: items.filter((item) => (item?.status || "").toLowerCase() === "cancelled").length,
      },
    ],
    [items],
  );

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 pb-3 pt-12">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
          >
            <Icon name="ArrowLeft" className="text-foreground" size={20} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-foreground">Dispatches</Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              Assigned deliveries for driver workflow.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(drivers)/settings" as any)}
            className="rounded-full border border-border bg-secondary px-3 py-1.5 active:opacity-80"
          >
            <View className="flex-row items-center gap-1">
              <Icon name="Settings" className="size-14 text-foreground" />
              <Text className="text-xs font-semibold text-foreground">Settings</Text>
            </View>
          </Pressable>
        </View>

        <View className="mt-3 flex-row items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
          <Text className="text-xs text-muted-foreground">Total Assigned</Text>
          <Text className="text-sm font-semibold text-foreground">{items.length}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="mt-3 gap-2 pr-2"
        >
          {filterOptions.map((option) => {
            const active = filter === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setFilter(option.key)}
                className={`rounded-full border px-3 py-1.5 ${
                  active ? "border-primary bg-primary/10" : "border-border bg-background"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {option.label} ({option.count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View className="mx-4 mb-4 mt-4 rounded-2xl border border-border bg-card p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center gap-3">
            <View className="rounded-full bg-secondary p-2">
              <Icon name="ClipboardList" className="size-18 text-foreground" />
            </View>
            <View>
              <Text className="text-lg font-bold text-foreground">
                {filterOptions.find((option) => option.key === filter)?.label || "All"} Dispatches
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                Swipe down to refresh. Scroll to load more.
              </Text>
            </View>
          </View>
        </View>
        <View className="mt-3 flex-row items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
          <Text className="text-xs text-muted-foreground">Showing</Text>
          <Text className="text-sm font-semibold text-foreground">{filteredItems.length}</Text>
        </View>
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-muted-foreground">
            Unable to load dispatches right now.
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-4 rounded-full bg-primary px-4 py-2 active:opacity-80"
          >
            <Text className="font-semibold text-primary-foreground">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          initialNumToRender={8}
          windowSize={8}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          renderItem={({ item, index }) => (
            <DriverDashboardDispatchItem
              item={item}
              index={index}
              onOpen={() => openDispatch(router, item)}
              onComplete={() => openDispatch(router, item, { openComplete: true })}
            />
          )}
          ListEmptyComponent={
            <View className="mx-4 mt-10 items-center rounded-2xl border border-dashed border-border p-8">
              <Text className="text-lg font-semibold text-foreground">
                No Dispatch Found
              </Text>
              <Text className="mt-2 text-center text-sm text-muted-foreground">
                No items match the selected filter.
              </Text>
            </View>
          }
          onMomentumScrollBegin={() => {
            canTriggerEndReached.current = true;
          }}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (!canTriggerEndReached.current) return;
            if (!hasNextPage || isFetchingNextPage) return;
            canTriggerEndReached.current = false;
            fetchNextPage();
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator />
              </View>
            ) : hasNextPage ? (
              <View className="h-8" />
            ) : (
              <View className="items-center py-4">
                <Text className="text-xs text-muted-foreground">
                  End of dispatch list
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}
