import React from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Icon, IconProps } from "./ui/icon";
import { JobAdminNavs } from "./job-admin-navs";

import { usePathname, useRouter } from "expo-router";
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

export default function JobQueueScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background pt-8">
      {/* HEADER */}
      <View className="px-6 pb-6 flex-row justify-between items-center bg-background z-10">
        <View>
          <Text className="text-foreground text-2xl font-bold tracking-tight">
            Job Queue
          </Text>
          <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Admin Dashboard
          </Text>
        </View>
        <Pressable className="relative w-10 h-10 rounded-full bg-secondary items-center justify-center border border-border">
          <Icon name="Bell" className="text-foreground" size={20} />
          <View className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-destructive border border-background" />
        </Pressable>
      </View>

      {/* SEARCH BAR */}
      <View className="px-6 mb-6">
        <View className="flex-row items-center bg-card rounded-full px-4 h-12 border border-border shadow-sm">
          <Icon
            name="Search"
            className="text-muted-foreground mr-3"
            size={18}
          />
          <TextInput
            placeholder="Search jobs, projects, or IDs"
            placeholderTextColor="hsl(var(--muted-foreground))"
            className="flex-1 text-foreground text-base h-full"
          />
        </View>
      </View>

      {/* FILTERS */}
      <View className="mb-6">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        >
          {FILTERS.map((filter, index) => {
            const isActive = index === 0;
            return (
              <Pressable
                key={filter}
                className={`px-5 py-2 rounded-full border ${
                  isActive
                    ? "bg-primary border-primary"
                    : "bg-card border-border"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* JOB LIST */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 120, gap: 16 }}
      >
        {JOBS.map((job, index) => (
          <JobCard key={`${job.id}-${index}`} job={job} />
        ))}
      </ScrollView>

      {/* FAB */}
      <Pressable className="absolute bottom-24 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg active:opacity-90">
        <Icon name="Plus" className="text-primary-foreground" size={28} />
      </Pressable>

      {/* BOTTOM NAVIGATION */}
      <JobAdminNavs />
    </SafeAreaView>
  );
}

/**
 * SUB-COMPONENTS
 */

const JobCard = ({ job }: { job: (typeof JOBS)[0] }) => {
  const isUrgent = job.isUrgent;

  // Determine status styles based on semantic tokens
  let statusBadgeBg = "bg-muted";
  let statusBadgeText = "text-muted-foreground";

  if (job.statusType === "primary") {
    statusBadgeBg = "bg-primary";
    statusBadgeText = "text-primary-foreground";
  } else if (job.statusType === "destructive") {
    statusBadgeBg = "bg-destructive/10"; // Fallback to opacity usage if strictly needed, or just bg-destructive-foreground inverted
    statusBadgeText = "text-destructive";
  } else if (job.statusType === "info") {
    statusBadgeBg = "bg-secondary";
    statusBadgeText = "text-secondary-foreground";
  }
  const router = useRouter();
  return (
    <Pressable
      onPress={(e) => {
        console.log("PRESS");
        router.push("/job-overview");
      }}
      className={`bg-card rounded-2xl p-5 border ${
        isUrgent ? "border-destructive" : "border-border"
      } shadow-sm`}
    >
      {/* Header Row */}
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1.5">
            <Text
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isUrgent ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {isUrgent ? "Urgent" : `#${job.id}`}
            </Text>
            <View
              className={`w-1 h-1 rounded-full ${
                isUrgent ? "bg-destructive" : "bg-muted-foreground"
              }`}
            />
            <Text className="text-[10px] font-medium text-muted-foreground">
              {job.time}
            </Text>
          </View>
          <Text className="text-card-foreground text-lg font-bold leading-tight pr-4">
            {job.title}
          </Text>
        </View>

        <View className={`px-2.5 py-1 rounded-full ${statusBadgeBg}`}>
          <Text className={`text-[10px] font-bold ${statusBadgeText}`}>
            {job.subStatus || job.status}
          </Text>
        </View>
      </View>

      {/* Contractor Row */}
      <View className="flex-row items-center gap-3 py-4 border-t border-b border-dashed border-border my-1">
        <View
          className={`h-9 w-9 rounded-full items-center justify-center border border-border ${
            job.initials ? "bg-secondary" : "bg-muted"
          }`}
        >
          {job.initials ? (
            <Text className="text-secondary-foreground text-xs font-bold">
              {job.initials}
            </Text>
          ) : (
            <Icon name="UserX" size={15} className="text-muted-foreground" />
          )}
        </View>
        <View>
          <Text className="text-xs text-muted-foreground mb-0.5">
            Contractor
          </Text>
          <Text
            className={`text-sm font-semibold ${
              job.initials ? "text-foreground" : "text-muted-foreground italic"
            }`}
          >
            {job.contractor}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-3 mt-4">
        {job.actions === "review" && (
          <>
            <Pressable className="flex-1 h-11 flex-row items-center justify-center rounded-full bg-card border border-border active:opacity-80">
              <Icon name="X" size={16} className="text-muted-foreground mr-2" />
              <Text className="text-muted-foreground font-semibold text-sm">
                Reject
              </Text>
            </Pressable>
            <Pressable className="flex-1 h-11 flex-row items-center justify-center rounded-full bg-primary active:opacity-90">
              <Icon
                name="Check"
                size={16}
                className="text-primary-foreground mr-2"
              />
              <Text className="text-primary-foreground font-bold text-sm">
                Approve
              </Text>
            </Pressable>
          </>
        )}

        {job.actions === "view" && (
          <Pressable className="flex-1 h-11 flex-row items-center justify-center rounded-full bg-card border border-border active:opacity-80">
            <Text className="text-card-foreground font-semibold text-sm mr-2">
              View Details
            </Text>
            <Icon
              name="ArrowRight"
              size={16}
              className="text-card-foreground"
            />
          </Pressable>
        )}

        {job.actions === "assign" && (
          <>
            <Pressable className="flex-1 h-11 flex-row items-center justify-center rounded-full bg-card border border-border active:opacity-80">
              <Text className="text-card-foreground font-semibold text-sm">
                Details
              </Text>
            </Pressable>
            <Pressable className="flex-1 h-11 flex-row items-center justify-center rounded-full bg-primary active:opacity-90">
              <Text className="text-primary-foreground font-bold text-sm">
                Assign Now
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </Pressable>
  );
};
