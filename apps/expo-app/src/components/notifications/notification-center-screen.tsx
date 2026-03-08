import { BackBtn } from "@/components/back-btn";
import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toast } from "@/components/ui/toast";
import { useNotifications } from "@/hooks/use-notifications";
import {
  type TransformedNotification,
  createNotificationHandlers,
  runNotificationAction,
} from "@notifications/notification-center";
import { useRouter } from "expo-router";
import { Fragment, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
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
}: {
  items: TransformedNotification[];
  onAction?: (notification: TransformedNotification) => void;
}) {
  if (!items.length) {
    return <EmptyState description="Nothing here yet." />;
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pb-24 pt-2"
      showsVerticalScrollIndicator={false}
    >
      {items.map((item, index) => (
        <Fragment key={item.id}>
          <NotificationItem activity={item} onAction={onAction} />
          {index < items.length - 1 ? (
            <View className="ml-16 h-px bg-border/70" />
          ) : null}
        </Fragment>
      ))}
    </ScrollView>
  );
}

export function NotificationCenterScreen() {
  const router = useRouter();
  const [tab, setTab] = useState("inbox");
  const { isLoading, error, notifications, archived } = useNotifications();
  const handlers = createNotificationHandlers({
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
      Toast.show(
        `Open configuration for ${data.modelName} (${data.projectName})`,
        { type: "info" },
      );
    },
    dispatch_packing_delay: (data) => {
      Toast.show(`Approved pending packing for ${data.itemName}.`, {
        type: "success",
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
                  {notifications.length} inbox
                </Text>
              </View>
              <View className="px-1 py-1">
                <Text className="text-xs font-medium text-foreground">
                  {archived.length} archived
                </Text>
              </View>
            </View>
          </View>

          <TabsContent value="inbox">
            {isLoading ? (
              <EmptyState description="Loading notifications..." />
            ) : error ? (
              <EmptyState description="Unable to load notifications right now." />
            ) : notifications.length ? (
              <>
                <NotificationList items={notifications} onAction={onAction} />
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
              <EmptyState description="No new notifications" />
            )}
          </TabsContent>

          <TabsContent value="archive">
            {isLoading ? (
              <EmptyState description="Loading notifications..." />
            ) : error ? (
              <EmptyState description="Unable to load notifications right now." />
            ) : archived.length ? (
              <NotificationList items={archived} onAction={onAction} />
            ) : (
              <EmptyState description="Nothing in the archive" />
            )}
          </TabsContent>
        </Tabs>
      </View>
    </SafeArea>
  );
}
