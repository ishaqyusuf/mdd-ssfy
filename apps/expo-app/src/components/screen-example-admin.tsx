import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StatusBar,
} from "react-native";
import { Icon, IconProps } from "./ui/icon";
import { SafeArea } from "./safe-area";
import { JobAdminNavs } from "./job-admin-navs";

const Header = () => (
  <View className="flex-row items-center justify-between px-6 py-4 border-b border-border bg-background">
    <View className="flex-row items-center gap-3">
      {/* Avatar: Initials Only */}
      <View className="h-11 w-11 rounded-full bg-muted items-center justify-center border border-border relative">
        <Text className="text-foreground font-bold text-sm">JD</Text>
        <View className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-accent rounded-full border-2 border-background" />
      </View>

      <View>
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted">
          Dashboard
        </Text>
        <Text className="text-lg font-bold text-foreground">
          Admin Overview
        </Text>
      </View>
    </View>

    <Pressable className="h-10 w-10 rounded-full bg-muted items-center justify-center border border-border">
      <Icon name="Bell" size={20} className="text-foreground" />
      <View className="absolute top-2.5 right-2.5 h-2 w-2 bg-accent rounded-full border border-background" />
    </Pressable>
  </View>
);

const StatCard = ({
  label,
  value,
  subtext,
  icon,
  variant = "primary",
}: {
  label: string;
  value: string;
  subtext: string;
  icon: IconProps["name"];
  variant?: "primary" | "accent";
}) => {
  const isAccent = variant === "accent";

  return (
    <View className="flex-1 bg-muted p-4 rounded-2xl border border-border overflow-hidden relative">
      <View
        className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 ${
          isAccent ? "bg-accent" : "bg-primary"
        }`}
      />

      <View className="flex-row items-center gap-2 mb-4 z-10">
        <View
          className={`h-8 w-8 rounded-lg items-center justify-center opacity-20 ${
            isAccent ? "bg-accent-foreground" : "bg-primary-foreground"
          }`}
        >
          <Icon
            name={icon}
            size={16}
            className={
              isAccent ? "text-accent-foreground" : "text-primary-foreground"
            }
          />
        </View>
        <Text className="text-xs font-semibold text-muted-foreground">
          {label}
        </Text>
      </View>

      <View className="z-10">
        <Text className="text-3xl font-bold text-foreground">{value}</Text>
        <Text className="text-xs text-muted mt-1">{subtext}</Text>
      </View>
    </View>
  );
};

const ActiveJobsCard = () => (
  <View className="w-full bg-primary/50 rounded-2xl p-5 shadow-sm relative overflow-hidden">
    <View className="absolute -right-6 -bottom-6 w-32 h-32 bg-background opacity-10 rounded-full" />

    <View className="flex-row justify-between items-end">
      <View className="z-10 flex-1">
        <View className="flex-row items-center gap-2 mb-2">
          <Icon
            name="Activity"
            size={18}
            className="text-foreground opacity-80"
          />
          <Text className="text-sm font-medium text-foreground">
            Active Jobs Summary
          </Text>
        </View>
        <Text className="text-4xl font-bold text-foreground">34</Text>
        <Text className="text-xs text-foreground opacity-60 mt-1">
          Jobs currently in progress
        </Text>
      </View>

      <View className="flex-row items-end h-12 gap-1.5 z-10">
        <View className="w-1.5 bg-foreground opacity-20 h-[40%] rounded-t-sm" />
        <View className="w-1.5 bg-foreground opacity-40 h-[70%] rounded-t-sm" />
        <View className="w-1.5 bg-foreground opacity-30 h-[50%] rounded-t-sm" />
        <View className="w-1.5 bg-foreground opacity-60 h-[85%] rounded-t-sm" />
        <View className="w-1.5 bg-foreground h-full rounded-t-sm" />
      </View>
    </View>
  </View>
);

const QuickActionItem = ({
  title,
  icon,
  image,
}: {
  title: string;
  icon: IconProps["name"];
  image: string;
}) => (
  <Pressable className="w-36 h-28 rounded-2xl overflow-hidden relative border border-border">
    <Image
      source={{ uri: image }}
      className="absolute inset-0 w-full h-full opacity-60"
      resizeMode="cover"
    />
    <View className="absolute inset-0 bg-background opacity-40" />

    <View className="absolute inset-0 p-4 justify-end">
      <View className="h-8 w-8 rounded-full bg-muted items-center justify-center mb-2 border border-border">
        <Icon name={icon} size={14} className="text-foreground" />
      </View>
      <Text className="text-foreground font-semibold text-sm leading-tight">
        {title}
      </Text>
    </View>
  </Pressable>
);

const JobListItem = ({
  title,
  status,
  variant,
  icon,
}: {
  title: string;
  status: string;
  variant: "primary" | "accent" | "destructive";
  icon: IconProps["name"];
}) => {
  // Map semantic variants to visual styles
  const getVariantStyles = () => {
    switch (variant) {
      case "accent":
        return {
          text: "text-accent",
          bg: "bg-accent",
          border: "border-accent",
        };
      case "primary":
        return {
          text: "text-primary",
          bg: "bg-primary",
          border: "border-primary",
        };
      case "destructive":
        return { text: "text-muted", bg: "bg-muted", border: "border-muted" }; // Fallback since destructive isn't in token list
      default:
        return { text: "text-muted", bg: "bg-muted", border: "border-muted" };
    }
  };

  const styles = getVariantStyles();

  return (
    <Pressable className="bg-muted p-4 rounded-xl border border-border flex-row items-center gap-4">
      <View
        className={`h-10 w-10 rounded-full items-center justify-center shrink-0 border border-border ${styles.bg} opacity-20`}
      >
        {/* We cheat slightly with opacity-100 on icon to make it visible against opacity-20 bg, or just use text color */}
      </View>
      {/* Overlay icon again for full opacity */}
      <View className="absolute left-4 top-4 h-10 w-10 items-center justify-center">
        <Icon name={icon} size={20} className={styles.text} />
      </View>

      <View className="flex-1">
        <Text
          className="text-foreground font-semibold text-sm"
          numberOfLines={1}
        >
          {title}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <View className={`h-1.5 w-1.5 rounded-full ${styles.bg}`} />
          <Text className="text-muted text-xs" numberOfLines={1}>
            {status}
          </Text>
        </View>
      </View>

      <Icon name="ChevronRight" size={20} className="text-muted opacity-50" />
    </Pressable>
  );
};

/**
 * ------------------------------------------------------------------
 * MAIN SCREEN
 * ------------------------------------------------------------------
 */

export default function DashboardScreen() {
  return (
    <SafeArea>
      <Header />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="p-5 gap-6">
          {/* Top Stats */}
          <View className="flex-row gap-4">
            <StatCard
              label="Pending"
              value="12"
              subtext="Jobs awaiting review"
              icon="Hourglass"
              variant="accent"
            />
            <StatCard
              label="Approvals"
              value="5"
              subtext="Needs action"
              icon="CheckSquare"
              variant="primary"
            />
          </View>

          {/* Featured Card */}
          <ActiveJobsCard />

          {/* Horizontal Scroll List */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-4">
              Quick Actions
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 20 }}
            >
              <QuickActionItem
                title={"Manage\nJobs"}
                icon="Briefcase"
                image="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop"
              />
              <QuickActionItem
                title={"Approve/\nReject Jobs"}
                icon="Gavel"
                image="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2370&auto=format&fit=crop"
              />
              <QuickActionItem
                title={"User\nManagement"}
                icon="UserCog"
                image="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2370&auto=format&fit=crop"
              />
            </ScrollView>
          </View>

          {/* Vertical List */}
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-foreground">
                Recent Jobs
              </Text>
              <Pressable className="bg-primary opacity-10 px-3 py-1.5 rounded-full absolute right-0 inset-0" />
              {/* Note: Overlay approach for bg opacity due to no custom colors. Simpler to just use transparent bg with text-primary if needed, but let's stick to clean primitives */}
              <View className="px-3 py-1.5 rounded-full border border-primary">
                <Text className="text-primary text-xs font-semibold">
                  See All
                </Text>
              </View>
            </View>

            <View className="gap-3">
              <JobListItem
                title="Kitchen Renovation"
                status="Approval Requested"
                variant="accent"
                icon="Hourglass"
              />
              <JobListItem
                title="Plumbing Fix"
                status="Assigned to Mike S."
                variant="primary"
                icon="User"
              />
              <JobListItem
                title="Electrical Wiring"
                status="Rejected"
                variant="destructive"
                icon="XCircle"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <JobAdminNavs />
    </SafeArea>
  );
}
