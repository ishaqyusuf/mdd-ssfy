import React from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Icon, IconProps } from "../components/ui/icon";
import { JobAdminNavs } from "../components/examples/job-admin-navs";

import { usePathname, useRouter } from "expo-router";
import { SafeArea } from "../components/safe-area";
import { Debug } from "../components/debug";
import { BackBtn } from "@/components/back-btn";
import { AddJobFab } from "@/components/add-job-fab";
import { useJobsContext } from "@/context/jobs-context";
import { LegendList } from "@legendapp/list";
import { JobsItem } from "@/components/jobs-item";
import { SearchInput } from "@/components/search-input";
import { HorizontalFilterPills } from "@/components/horizontal-filter-pills";
import { LoadingSpinner } from "@/components/loading-spinner";
/**
 * MOCK DATA
 */
const FILTERS = ["All", "Pending Review", "Assigned", "Urgent", "Rejected"];

const JOBS = [
  {
    id: "J-4022",
    time: "2h ago",
    title: "Office Renovation - Lvl 3",
    status: "Pending",
    statusType: "primary",
    contractor: "Acme Electricians",
    initials: "AE",
    actions: "review",
  },
  {
    id: "J-4021",
    time: "5h ago",
    title: "HVAC Repair - Main Hall",
    status: "Assigned",
    statusType: "info",
    contractor: "John Doe",
    initials: "JD",
    actions: "view",
  },
  {
    id: "J-3998",
    time: "Just now",
    title: "Water Leak - B2 Storage",
    status: "Urgent",
    statusType: "destructive",
    subStatus: "Unassigned",
    contractor: "Not assigned",
    initials: null,
    actions: "assign",
    isUrgent: true,
  },
  {
    id: "J-3999",
    time: "Yesterday",
    title: "Server Room A/C Maintenance",
    status: "Pending",
    statusType: "primary",
    contractor: "Sarah Jenkins",
    initials: "SJ",
    actions: "review",
  },
];

export function JobsScreen() {
  const { items, state, actions } = useJobsContext();

  return (
    <SafeArea>
      {/* HEADER */}
      <View className="pt-8 gap-4 px-6 pb-6 flex-row   items-center z-10">
        <BackBtn />
        <View>
          <Text className="text-foreground text-2xl font-bold tracking-tight">
            Jobs
          </Text>
          {/* <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Admin Dashboard
          </Text> */}
        </View>
        <View className="flex-1" />
        <Pressable className="relative w-10 h-10 rounded-full bg-secondary items-center justify-center border border-border">
          <Icon name="Bell" className="text-foreground" size={20} />
          <View className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-destructive border border-background" />
        </Pressable>
      </View>

      {/* SEARCH BAR */}
      <SearchInput
        size="sm"
        className="mb-2"
        placeholder="Search jobs, projects, or IDs"
      />

      {/* FILTERS */}
      <HorizontalFilterPills name={"show"}>
        <HorizontalFilterPills.Pill label="All" value="" />
        <HorizontalFilterPills.Pill
          label="Pending Review"
          value="pendingReview"
        />
        <HorizontalFilterPills.Pill label="Assigned" value="assigned" />
        <HorizontalFilterPills.Pill label="Rejected" value="rejected" />
      </HorizontalFilterPills>

      {/* JOB LIST */}
      <LegendList
        onRefresh={actions.refetch}
        ListHeaderComponent={<></>}
        refreshing={state.isRefetching}
        data={items}
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
        // ListFooterComponent={
        //   <View className="mb-48">
        //     <LoadingSpinner />
        //   </View>
        // }
        ListFooterComponent={
          state.isFetching ? (
            <ActivityIndicator size="small" color="#0000ff" />
          ) : null
        }
        onEndReached={() => {
          if (state.hasNextPage && !state.isFetching) {
            actions.fetchNextPage();
          }
        }}
      />

      {/* FAB */}
      <AddJobFab />

      {/* BOTTOM NAVIGATION */}
      <Debug>
        <JobAdminNavs />
      </Debug>
    </SafeArea>
  );
}
