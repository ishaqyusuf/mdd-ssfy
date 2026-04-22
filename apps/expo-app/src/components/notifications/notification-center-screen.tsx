import { BackBtn } from "@/components/back-btn";
import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toast } from "@/components/ui/toast";
import { useAuthContext } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import {
  type TransformedNotification,
  createNotificationHandlers,
  runNotificationAction,
} from "@notifications/notification-center";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { NotificationItem } from "./notification-item";

function EmptyState({ description }: { description: string }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon name="Mail" className="text-muted-foreground" size={18} />
      </View>
      <Text className="text-center text-sm text-muted-foreground">
        {description}
      </Text>
    </View>
  );
}

function NotificationList({
  items,
  onAction,
  refreshing = false,
  onRefresh,
  hasNextPage = false,
  isFetchingNextPage = false,
  onEndReached,
}: {
  items: TransformedNotification[];
  onAction?: (notification: TransformedNotification) => void;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onEndReached?: () => void;
}) {
  const canTriggerEndReached = useRef(true);

  if (!items.length) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <EmptyState description="Nothing here yet." />
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      className="flex-1"
      contentContainerClassName="px-4 pb-24 pt-2"
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      windowSize={8}
      refreshing={refreshing}
      onRefresh={onRefresh}
      renderItem={({ item, index }) => (
        <>
          <NotificationItem activity={item} onAction={onAction} />
          {index < items.length - 1 ? (
            <View className="ml-16 h-px bg-border/70" />
          ) : null}
        </>
      )}
      onMomentumScrollBegin={() => {
        canTriggerEndReached.current = true;
      }}
      onEndReachedThreshold={0.35}
      onEndReached={() => {
        if (!canTriggerEndReached.current) return;
        if (!hasNextPage || isFetchingNextPage) return;
        canTriggerEndReached.current = false;
        onEndReached?.();
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
              End of notifications
            </Text>
          </View>
        )
      }
    />
  );
}

export function NotificationCenterScreen() {
  const router = useRouter();
  const auth = useAuthContext();
  const [tab, setTab] = useState("inbox");
  const { isLoading, error, inbox, archived, refresh } = useNotifications({
    includeArchived: true,
  });
  const handlers = createNotificationHandlers({
    job_submitted: (data) => {
      router.push(`/job/${data.jobId}` as any);
    },
    quote_accepted: (data) => {
      router.push({
        pathname: "/(sales)/orders/[orderNo]",
        params: {
          orderNo: String(data.orderNo),
        },
      });
    },
    sales_checkout_success: (data) => {
      const firstOrderNo = data.orderNos[0];
      if (!firstOrderNo) return;

      router.push({
        pathname: "/(sales)/orders/[orderNo]",
        params: {
          orderNo: String(firstOrderNo),
        },
      });
    },
    sales_payment_recorded: (data) => {
      router.push({
        pathname: "/(sales)/orders/[orderNo]",
        params: {
          orderNo: String(data.orderNo),
        },
      });
    },
    sales_marked_as_production_completed: (data) => {
      router.push({
        pathname: "/(sales)/orders/[orderNo]",
        params: {
          orderNo: String(data.orderNo ?? data.salesId),
        },
      });
    },
    sales_dispatch_assigned: (data) => {
      if (auth.isAdmin && auth.currentSectionKey === "sales") {
        router.push({
          pathname: "/(sales)/dispatch/[dispatchId]",
          params: {
            dispatchId: String(data.dispatchId),
          },
        });
        return;
      }
      router.push({
        pathname: "/(drivers)/dispatch/[dispatchId]",
        params: {
          dispatchId: String(data.dispatchId),
        },
      });
    },
    job_task_configure_request: (data) => {
      router.push({
        pathname: "/(job)/install-cost/[modelId]/form",
        params: {
          modelId: String(data.modelId),
          builderTaskId: String(data.builderTaskId),
          requestBuilderTaskId: String(data.builderTaskId),
          ...(data.jobId ? { jobId: String(data.jobId) } : {}),
          ...(data.contractorId
            ? { contractorId: String(data.contractorId) }
            : {}),
        },
      } as any);
    },
    dispatch_packing_delay: (data) => {
      Toast.show(`Approved pending packing for ${data.itemName}.`, {
        type: "success",
      });
    },
    sales_dispatch_duplicate_alert: (data) => {
      if (auth.isAdmin && auth.currentSectionKey === "sales") {
        router.push({
          pathname: "/(sales)/dispatch/[dispatchId]",
          params: {
            dispatchId: String(data.dispatchId),
          },
        });
        return;
      }
      router.push({
        pathname: "/(drivers)/dispatch/[dispatchId]",
        params: {
          dispatchId: String(data.dispatchId),
        },
      });
    },
  });

  const onAction = async (notification: TransformedNotification) => {
    await runNotificationAction(notification, handlers, undefined);
  };

  return (
    <SafeArea>
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <BackBtn />
          <Text className="text-base font-bold text-foreground">
            Notifications
          </Text>
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
            accessibilityRole="button"
          >
            <Icon name="Settings" className="text-foreground" size={18} />
          </Pressable>
        </View>

        <Tabs value={tab} onValueChange={setTab} className="flex-1">
          <View className="border-b border-border px-4 py-3">
            <TabsList className="h-10">
              <TabsTrigger value="inbox" className="px-6">
                <Text>Inbox</Text>
              </TabsTrigger>
              <TabsTrigger value="archive" className="px-6">
                <Text>Archive</Text>
              </TabsTrigger>
            </TabsList>
            <View className="mt-3 flex-row gap-2">
              <View className="px-1 py-1">
                <Text className="text-xs font-medium text-foreground">
                  {inbox.items.length} inbox
                </Text>
              </View>
              <View className="px-1 py-1">
                <Text className="text-xs font-medium text-foreground">
                  {archived.items.length} archived
                </Text>
              </View>
            </View>
          </View>

          <TabsContent value="inbox">
            {isLoading ? (
              <ScrollView
                className="flex-1"
                contentContainerClassName="flex-grow"
                refreshControl={
                <RefreshControl
                    refreshing={inbox.isRefreshing}
                    onRefresh={refresh}
                  />
                }
              >
                <EmptyState description="Loading notifications..." />
              </ScrollView>
            ) : error ? (
              <ScrollView
                className="flex-1"
                contentContainerClassName="flex-grow"
                refreshControl={
                <RefreshControl
                    refreshing={inbox.isRefreshing}
                    onRefresh={refresh}
                  />
                }
              >
                <EmptyState description="Unable to load notifications right now." />
              </ScrollView>
            ) : inbox.items.length ? (
              <>
                <NotificationList
                  items={inbox.items}
                  onAction={onAction}
                  refreshing={inbox.isRefreshing}
                  onRefresh={refresh}
                  hasNextPage={!!inbox.hasNextPage}
                  isFetchingNextPage={inbox.isFetchingNextPage}
                  onEndReached={() => {
                    void inbox.fetchNextPage();
                  }}
                />
                <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-card px-4 py-2">
                  <Pressable
                    className="h-10 items-center justify-center rounded-full opacity-50"
                    disabled
                  >
                    <Text className="text-sm font-medium text-foreground">
                      Archive all
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <ScrollView
                className="flex-1"
                contentContainerClassName="flex-grow"
                refreshControl={
                <RefreshControl
                    refreshing={inbox.isRefreshing}
                    onRefresh={refresh}
                  />
                }
              >
                <EmptyState description="No new notifications" />
              </ScrollView>
            )}
          </TabsContent>

          <TabsContent value="archive">
            {isLoading ? (
              <ScrollView
                className="flex-1"
                contentContainerClassName="flex-grow"
                refreshControl={
                <RefreshControl
                    refreshing={archived.isRefreshing}
                    onRefresh={refresh}
                  />
                }
              >
                <EmptyState description="Loading notifications..." />
              </ScrollView>
            ) : error ? (
              <ScrollView
                className="flex-1"
                contentContainerClassName="flex-grow"
                refreshControl={
                <RefreshControl
                    refreshing={archived.isRefreshing}
                    onRefresh={refresh}
                  />
                }
              >
                <EmptyState description="Unable to load notifications right now." />
              </ScrollView>
            ) : archived.items.length ? (
              <NotificationList
                items={archived.items}
                onAction={onAction}
                refreshing={archived.isRefreshing}
                onRefresh={refresh}
                hasNextPage={!!archived.hasNextPage}
                isFetchingNextPage={archived.isFetchingNextPage}
                onEndReached={() => {
                  void archived.fetchNextPage();
                }}
              />
            ) : (
              <ScrollView
                className="flex-1"
                contentContainerClassName="flex-grow"
                refreshControl={
                  <RefreshControl
                    refreshing={archived.isRefreshing}
                    onRefresh={refresh}
                  />
                }
              >
                <EmptyState description="Nothing in the archive" />
              </ScrollView>
            )}
          </TabsContent>
        </Tabs>
      </View>
    </SafeArea>
  );
}
