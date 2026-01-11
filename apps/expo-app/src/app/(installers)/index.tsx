import { Debug } from "@/components/debug";
import { InstallerDashboardHeader2 } from "@/components/installer-dashboard/installer-dashboard-header-2";
import { JobAnalytics2 } from "@/components/installer-dashboard/job-analytics-2";
import { JobListItem2 } from "@/components/jobs-item-installer";

import { Icon } from "@/components/ui/icon";
import { HomeProvider, useCreateHomeContext } from "@/context/home-context";
import { LegendList } from "@legendapp/list";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

// As per the rules, all components are defined in this single file.
// The component is named Home2 to match the filename.

export default function Home2() {
  const router = useRouter();
  const ctx = useCreateHomeContext();
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
                  router.push("/(installers)/create");
                }}
                className="w-full h-16 bg-primary rounded-full flex-row items-center justify-center gap-4"
              >
                <Icon
                  name="PlusCircle"
                  className="text-muted-foreground"
                  size={28}
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
                      router.push("/jobs2");
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
        data={ctx?.recentJobs}
        renderItem={({ item }) => <JobListItem2 item={item} />}
      />
    </HomeProvider>
  );
}
