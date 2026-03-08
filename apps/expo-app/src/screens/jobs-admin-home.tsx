import { AdminJobsDashboardHeaderContent } from "@/components/dashboard/admin-jobs-dashboard-header-content";
import { ContractorJobsDashboardContent } from "@/components/dashboard/contractor-jobs-dashboard-content";
import { JobsItem } from "@/components/jobs-item";
import { Pressable } from "@/components/ui/pressable";
import { _trpc } from "@/components/static-trpc";
import { Text } from "@/components/ui/text";
import { useAuthContext } from "@/hooks/use-auth";
import {
  HomeProvider,
  useCreateHomeContext,
  useHomeContext,
} from "@/context/home-context";
import { LegendList } from "@legendapp/list";
import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { useCallback } from "react";

type DashboardVariant = "admin" | "contractor";
type DashboardAnalytics = {
  approvedThisMonth?: number | null;
  jobsPendingApproval?: number | null;
  jobsInProgress?: number | null;
};

export function JobsAdminHome() {
  const auth = useAuthContext();
  const variant: DashboardVariant =
    auth.currentSectionKey === "installer" ? "contractor" : "admin";

  return (
    <HomeProvider
      value={useCreateHomeContext({
        jobsProps: { recent: true },
      })}
    >
      <Content variant={variant} />
    </HomeProvider>
  );
}

function Content({ variant }: { variant: DashboardVariant }) {
  const { jobsCtx } = useHomeContext();
  const {
    data: analytics,
    isRefetching,
    refetch,
  } = useQuery(_trpc.jobs.adminAnalytics.queryOptions({}));
  const onRefresh = useCallback(async () => {
    await Promise.all([jobsCtx?.actions?.refetch?.(), refetch()]);
  }, [jobsCtx?.actions, refetch]);

  return (
    <View className="gap-4 flex-1">
      <LegendList
        ListHeaderComponent={
          <>
            <DashboardHeader analytics={analytics} variant={variant} />
            <View className="flex-row justify-between items-center px-5 mt-2 mb-4">
              <Text className="text-lg font-bold text-foreground">Recent Jobs</Text>
              <Pressable
                href={"/jobs"}
                className="px-3 py-1.5 rounded-full bg-primary/10 active:bg-primary/20"
              >
                <Text className="text-xs font-semibold text-primary">See All</Text>
              </Pressable>
            </View>
          </>
        }
        data={jobsCtx?.items || []}
        onRefresh={onRefresh}
        refreshing={jobsCtx?.state?.isRefetching || isRefetching}
        renderItem={({ item }) => (
          <JobsItem item={item} hideAssigneeName={variant === "contractor"} />
        )}
        keyExtractor={(item) => String(item.id)}
        ListFooterComponent={<View className="mb-48"></View>}
      />
    </View>
  );
}

function DashboardHeader({
  variant,
  analytics,
}: {
  variant: DashboardVariant;
  analytics?: DashboardAnalytics;
}) {
  if (variant === "contractor") {
    return <ContractorJobsDashboardContent analytics={analytics} />;
  }
  return <AdminJobsDashboardHeaderContent analytics={analytics} />;
}
