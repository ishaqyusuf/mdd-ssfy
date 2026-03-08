import { HeaderContainer } from "@/components/header-container";
import { LoggedInAvatar } from "@/components/logged-in-avatar";
import { Titles } from "@/components/titles";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { useNotifications } from "@/hooks/use-notifications";
import { useRouter } from "expo-router";
import { View } from "react-native";

type DashboardAnalytics = {
  approvedThisMonth?: number | null;
  jobsPendingApproval?: number | null;
  jobsInProgress?: number | null;
};

export function AdminJobsDashboardHeaderContent({
  analytics,
}: {
  analytics?: DashboardAnalytics;
}) {
  const { hasUnseenNotifications } = useNotifications();
  const router = useRouter();

  return (
    <View className="gap-4">
      <HeaderContainer>
        <LoggedInAvatar />
        <Titles.HeaderTitle headline="Dashboard" title="Admin Overview" />
        <View className="flex-1" />
        <Pressable
          onPress={() => router.push("/notifications")}
          className="relative rounded-full p-2 active:bg-muted"
        >
          <Icon name="Bell" className="text-foreground size-20" />
          {!hasUnseenNotifications || (
            <View className="absolute right-2 top-2 h-2 w-2 rounded-full border border-card bg-destructive" />
          )}
        </Pressable>
        <Pressable href="/settings" className="rounded-full p-2 active:bg-muted">
          <Icon name="Settings" className="text-foreground size-20" />
        </Pressable>
      </HeaderContainer>

      <View className="px-4 gap-4">
        <View className="flex-row gap-4">
          <View className="flex-1 min-w-[45%] bg-card p-4 rounded-2xl border border-border h-32 justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 rounded-lg bg-accent/20 items-center justify-center">
                <Icon name="Hourglass" className="text-accent-foreground" size={18} />
              </View>
              <Text className="text-xs font-semibold text-muted-foreground">
                Approved
              </Text>
            </View>
            <View>
              <Text className="text-3xl font-bold text-foreground">
                {analytics?.approvedThisMonth ?? 0}
              </Text>
              <Text className="text-xs text-muted-foreground mt-1">
                approved this month
              </Text>
            </View>
          </View>

          <View className="flex-1 min-w-[45%] bg-card p-4 rounded-2xl border border-border h-32 justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 rounded-lg bg-primary/20 items-center justify-center">
                <Icon name="ClipboardCheck" className="text-primary" size={18} />
              </View>
              <Text className="text-xs font-semibold text-muted-foreground">
                Approvals
              </Text>
            </View>
            <View>
              <Text className="text-3xl font-bold text-foreground">
                {analytics?.jobsPendingApproval ?? 0}
              </Text>
              <Text className="text-xs text-muted-foreground mt-1">
                Pending Approval
              </Text>
            </View>
          </View>
        </View>

        <View className="rounded-2xl bg-primary p-5 flex-row items-center justify-between">
          <View className="gap-1">
            <View className="flex-row items-center gap-2 mb-1">
              <Icon name="HardHat" className="text-primary-foreground/80" size={20} />
              <Text className="text-sm font-medium text-primary-foreground/90">
                Active Jobs Summary
              </Text>
            </View>
            <Text className="text-4xl font-bold text-primary-foreground">
              {analytics?.jobsInProgress ?? 0}
            </Text>
            <Text className="text-xs text-primary-foreground/60">
              Jobs currently in progress
            </Text>
          </View>
          <View className="flex-row gap-1 items-end h-12">
            <View className="w-1.5 bg-primary-foreground/20 h-[40%] rounded-t-sm" />
            <View className="w-1.5 bg-primary-foreground/40 h-[70%] rounded-t-sm" />
            <View className="w-1.5 bg-primary-foreground/30 h-[50%] rounded-t-sm" />
            <View className="w-1.5 bg-primary-foreground/60 h-[85%] rounded-t-sm" />
            <View className="w-1.5 bg-primary-foreground h-full rounded-t-sm" />
          </View>
        </View>

        <Pressable
          href="/job-form"
          className="w-full rounded-2xl bg-secondary active:bg-secondary/90 border border-border p-5 flex-row items-center justify-between"
        >
          <View>
            <Text className="text-lg font-bold text-secondary-foreground">
              Assign New Job
            </Text>
            <Text className="text-muted-foreground text-xs mt-1">
              Dispatch contractors to a new site
            </Text>
          </View>
          <View className="h-10 w-10 rounded-full bg-background/50 items-center justify-center">
            <Icon name="Plus" className="text-foreground" size={24} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
