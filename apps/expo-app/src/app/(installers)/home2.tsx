import { Debug } from "@/components/debug";
import { InstallerDashboardHeader2 } from "@/components/installer-dashboard/installer-dashboard-header-2";
import { JobAnalytics2 } from "@/components/installer-dashboard/job-analytics-2";
import { JobStatusCards } from "@/components/installer-dashboard/job-status-cards";
import { RecentJobs2 } from "@/components/installer-dashboard/recent-jobs2";
import { Logout } from "@/components/logout";
import { ThemeToggle } from "@/components/theme-toggle";
import { Icon, IconProps } from "@/components/ui/icon";
import { Link, useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

// As per the rules, all components are defined in this single file.
// The component is named Home2 to match the filename.

const ActivityItem = ({
  icon,
  title,
  subtitle,
  value,
  time,
  valueColor = "text-primary",
}: {
  icon: IconProps["name"];
  title: string;
  subtitle: string;
  value: string;
  time: string;
  valueColor?: string;
}) => (
  <View className="flex-row items-center gap-4 bg-card p-3 rounded-3xl border border-border">
    <View className="h-14 w-14 rounded-2xl bg-background flex items-center justify-center shrink-0 border border-border">
      <Icon
        name={icon}
        className={
          valueColor === "text-primary" ? "text-primary" : "text-foreground"
        }
      />
    </View>
    <View className="flex-1 min-w-0">
      <Text className="text-base font-bold text-foreground" numberOfLines={1}>
        {title}
      </Text>
      <Text className="text-sm text-muted-foreground" numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
    <View className="text-right px-2">
      <Text className={`font-bold text-sm ${valueColor}`}>{value}</Text>
      <Text className="text-xs text-muted-foreground">{time}</Text>
    </View>
  </View>
);

const NavItem = ({
  icon,
  label,
  active = false,
}: {
  icon: IconProps["name"];
  label: string;
  active?: boolean;
}) => (
  <TouchableOpacity className="flex flex-col items-center gap-1">
    <Icon
      name={icon}
      className={active ? "text-primary" : "text-muted-foreground"}
    />
    <Text
      className={`text-[10px] font-bold ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const BottomNavBar = () => (
  <View className="absolute bottom-0 left-0 w-full bg-card border-t border-border pb-6 pt-3 px-8 z-40">
    <View className="flex-row justify-between items-center">
      <NavItem icon="House" label="Home" active />
      <NavItem icon="ClipboardList" label="Jobs" />
      <NavItem icon="Wallet" label="Wallet" />
      <NavItem icon="User" label="Profile" />
    </View>
  </View>
);

export default function Home2() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-background">
      <InstallerDashboardHeader2 />
      <ScrollView contentContainerClassName="">
        <JobAnalytics2 />

        <Debug>
          <Link
            className="text-foreground p-2 bg-foreground"
            href={"/(installers)"}
          >
            v1!
          </Link>
        </Debug>
        <View className="px-5 mt-6">
          <TouchableOpacity
            onPress={(e) => {
              router.push("/(installers)/create");
            }}
            className="w-full h-16 bg-primary rounded-full flex-row items-center justify-center gap-4"
          >
            <Icon
              name="CirclePlus"
              className="text-muted-foreground"
              size={28}
            />
            <Text className="text-primary-foreground text-lg font-bold">
              Add New Job
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-8">
          <JobStatusCards />
        </View>
        <RecentJobs2 />
        <View className="px-5 mt-4 mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">
              Recent Activity
            </Text>
            <TouchableOpacity
              onPress={(e) => {
                router.push("/jobs2");
              }}
            >
              <Text className="text-sm font-bold text-primary">View All</Text>
            </TouchableOpacity>
          </View>
          <Debug>
            <View className="flex flex-col gap-3">
              <ActivityItem
                icon="Wallet"
                title="Payment Received"
                subtitle="Bathroom Reno - 123 Main St"
                value="+$850"
                time="2h ago"
                valueColor="text-primary"
              />
              <ActivityItem
                icon="FileText"
                title="Quote Sent"
                subtitle="Kitchen Tile - 45 Elm St"
                value="Pending"
                time="5h ago"
                valueColor="text-muted-foreground"
              />
              <ActivityItem
                icon="Calendar"
                title="Job Scheduled"
                subtitle="Deck Repair - 88 Oak Ln"
                value="Nov 14"
                time="1d ago"
                valueColor="text-accent"
              />
            </View>
          </Debug>
        </View>
      </ScrollView>
      {/* <BottomNavBar /> */}
    </View>
  );
}
