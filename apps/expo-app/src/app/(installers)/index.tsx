import { Debug } from "@/components/debug";
import { InstallerDashboardHeader2 } from "@/components/installer-dashboard/installer-dashboard-header-2";
import { JobAnalytics2 } from "@/components/installer-dashboard/job-analytics-2";
import { JobsItem } from "@/components/jobs-item";
import { _push } from "@/components/static-router";
import { Icon } from "@/components/ui/icon";
import { HomeProvider, useCreateHomeContext } from "@/context/home-context";
import { LegendList } from "@legendapp/list";
import React from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";

// As per the rules, all components are defined in this single file.
// The component is named Home2 to match the filename.

export default function Home2() {
  const ctx = useCreateHomeContext({
    jobsProps: {
      recent: true,
    },
  });
  return (
    <HomeProvider value={ctx}>
      <InstallerDashboardHeader2 />
      <LegendList
        onRefresh={ctx.refresh}
        ListHeaderComponent={
          <>
            <JobAnalytics2 />
            <View className="px-5 mt-6">
              <TouchableOpacity
                onPress={(e) => {
                  _push("/(installers)/create");
                }}
                className="w-full h-16 bg-primary rounded-full flex-row items-center justify-center gap-4"
              >
                <Icon
                  name="Plus"
                  className="text-primary-foreground"
                  size={24}
                />
                <Text className="text-primary-foreground text-lg font-bold">
                  Add New Job
                </Text>
              </TouchableOpacity>
            </View>
            <View className="px-5 mt-4">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-foreground">
                  Recent Activity
                </Text>
                <Debug>
                  <TouchableOpacity
                    onPress={(e) => {
                      _push("/jobs");
                    }}
                  >
                    <Text className="text-sm font-bold text-primary">
                      View All
                    </Text>
                  </TouchableOpacity>
                </Debug>
              </View>
            </View>
          </>
        }
        refreshing={ctx.isRefreshing}
        data={ctx?.jobsCtx?.items}
        renderItem={({ item }) => <JobsItem item={item} />}
        ListEmptyComponent={
          <View className="px-4 mb-32">
            <View className="min-h-75 items-center justify-center rounded-2xl bg-card/40 border-2 border-dashed border-muted/20 p-8">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-muted/10">
                <Icon
                  name="AlertCircle"
                  className="text-muted-foreground size-40"
                />
              </View>

              <Text className="text-xl font-bold text-foreground text-center">
                No recent jobs found
              </Text>
              <Text className="mt-2 text-sm text-muted-foreground text-center max-w-62.5">
                Submit your first job to see it here.
              </Text>

              <Pressable className="mt-8 flex-row items-center gap-2 rounded-full bg-accent/10 px-6 py-3 active:scale-95">
                <Icon name="Plus" className="text-accent size-18" />
                <Text className="text-sm font-bold text-accent">
                  Create Job
                </Text>
              </Pressable>
            </View>
          </View>
        }
        ListFooterComponent={<View className="mb-48"></View>}
      />
    </HomeProvider>
  );
}
