import { useAssignedDispatchList } from "../api/use-assigned-dispatch-list";
import { DispatchListItemCard } from "./dispatch-list-item";
import { useRouter } from "expo-router";
import { Icon } from "@/components/ui/icon";
import { useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

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

  return (
    <View className="flex-1 bg-background pt-8">
      <View className="mx-4 mb-4 rounded-2xl border border-border bg-card p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center gap-3">
            <View className="rounded-full bg-secondary p-2">
              <Icon name="ClipboardList" className="size-18 text-foreground" />
            </View>
            <View>
              <Text className="text-2xl font-bold text-foreground">Dispatches</Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                Assigned deliveries for driver workflow.
              </Text>
            </View>
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
          data={items}
          keyExtractor={(item) => String(item.id)}
          initialNumToRender={8}
          windowSize={8}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          renderItem={({ item }) => (
            <DispatchListItemCard
              item={item}
              onPress={(dispatch) => {
                router.push(
                  {
                    pathname: "/(drivers)/dispatch/[dispatchId]",
                    params: {
                      dispatchId: String(dispatch.id),
                      salesNo: dispatch?.order?.orderId || "",
                    },
                  } as any,
                );
              }}
            />
          )}
          ListEmptyComponent={
            <View className="mx-4 mt-10 items-center rounded-2xl border border-dashed border-border p-8">
              <Text className="text-lg font-semibold text-foreground">
                No Dispatch Found
              </Text>
              <Text className="mt-2 text-center text-sm text-muted-foreground">
                You currently have no assigned dispatches.
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
