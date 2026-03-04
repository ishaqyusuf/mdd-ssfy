import { BackBtn } from "@/components/back-btn";
import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type NotificationItem = {
  id: number;
  subject: string;
  headline: string;
  time: string;
  unread?: boolean;
};

const inboxSeed: NotificationItem[] = [
  {
    id: 1,
    subject: "Job assigned",
    headline: "You have a new installation job assigned for today.",
    time: "5m ago",
    unread: true,
  },
  {
    id: 2,
    subject: "Schedule update",
    headline: "Site visit time moved from 2:00 PM to 3:30 PM.",
    time: "1h ago",
    unread: true,
  },
  {
    id: 3,
    subject: "Reminder",
    headline: "Complete and submit pending job reports.",
    time: "Yesterday",
  },
];

const archivedSeed: NotificationItem[] = [
  {
    id: 11,
    subject: "Payment confirmed",
    headline: "Your recent job payout has been processed successfully.",
    time: "2d ago",
  },
];

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

function NotificationList({ items }: { items: NotificationItem[] }) {
  if (!items.length) {
    return <EmptyState description="Nothing here yet." />;
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="pb-24"
      showsVerticalScrollIndicator={false}
    >
      <View className="divide-y divide-border">
        {items.map((item) => (
          <Pressable
            key={item.id}
            className="px-4 py-3 active:bg-muted"
            accessibilityRole="button"
          >
            <View className="mb-1 flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-sm font-semibold text-foreground">
                {item.subject}
              </Text>
              <Text className="text-xs text-muted-foreground">{item.time}</Text>
            </View>
            <Text className="text-xs text-muted-foreground">{item.headline}</Text>
            {item.unread ? (
              <View className="mt-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            ) : null}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

export function NotificationCenterScreen() {
  const [inbox, setInbox] = useState(inboxSeed);
  const [archive] = useState(archivedSeed);
  const [tab, setTab] = useState("inbox");

  const hasInboxItems = useMemo(() => inbox.length > 0, [inbox.length]);

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
          </View>

          <TabsContent value="inbox">
            {hasInboxItems ? (
              <>
                <NotificationList items={inbox} />
                <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-card px-4 py-2">
                  <Pressable
                    onPress={() => setInbox([])}
                    className="h-10 items-center justify-center rounded-full active:bg-muted"
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
            {archive.length ? (
              <NotificationList items={archive} />
            ) : (
              <EmptyState description="Nothing in the archive" />
            )}
          </TabsContent>
        </Tabs>
      </View>
    </SafeArea>
  );
}
