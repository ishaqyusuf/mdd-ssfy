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

export function ContractorJobsDashboardContent({
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
        <Titles.HeaderTitle headline="Dashboard" title="Contractor Overview" />
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
        <View className="rounded-3xl border border-border bg-card px-5 py-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs uppercase tracking-wider text-muted-foreground">
                Active Assignments
              </Text>
              <Text className="text-5xl font-black text-foreground mt-1">
                {analytics?.jobsInProgress ?? 0}
              </Text>
              <Text className="text-xs text-muted-foreground mt-1">
                jobs currently in progress
              </Text>
            </View>
            <View className="h-14 w-14 rounded-2xl bg-primary/15 items-center justify-center">
              <Icon name="HardHat" className="text-primary" size={28} />
            </View>
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-border bg-background p-4">
            <View className="flex-row items-center gap-2">
              <Icon name="Check" className="text-green-600" size={16} />
              <Text className="text-xs font-semibold text-muted-foreground">
                Completed
              </Text>
            </View>
            <Text className="mt-2 text-3xl font-bold text-foreground">
              {analytics?.approvedThisMonth ?? 0}
            </Text>
            <Text className="text-xs text-muted-foreground">this month</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-background p-4">
            <View className="flex-row items-center gap-2">
              <Icon name="Hourglass" className="text-amber-600" size={16} />
              <Text className="text-xs font-semibold text-muted-foreground">
                Awaiting Review
              </Text>
            </View>
            <Text className="mt-2 text-3xl font-bold text-foreground">
              {analytics?.jobsPendingApproval ?? 0}
            </Text>
            <Text className="text-xs text-muted-foreground">
              jobs pending approval
            </Text>
          </View>
        </View>

        <Pressable
          href="/job-form"
          className="w-full rounded-2xl bg-primary active:bg-primary/90 p-5 flex-row items-center justify-between"
        >
          <View>
            <Text className="text-lg font-bold text-primary-foreground">
              Submit New Job
            </Text>
            <Text className="text-primary-foreground/80 text-xs mt-1">
              Submit a new job for review
            </Text>
          </View>
          <View className="h-10 w-10 rounded-full bg-primary-foreground/20 items-center justify-center">
            <Icon name="ArrowRight" className="text-primary-foreground" size={22} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
