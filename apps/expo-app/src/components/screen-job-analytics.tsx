import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";

import { SafeArea } from "./safe-area";
import { ThemeToggle } from "./theme-toggle";
import { Icon, IconProps } from "./ui/icon";
import { cn } from "@/lib/utils";
import { JobAdminNavs } from "./examples/job-admin-navs";

// --- Types & Interfaces ---

interface KPI {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: IconProps["name"];
  iconColor: string; // mapping to semantic classes logic
  accentColor: string;
}

interface Contractor {
  id: string;
  name: string;
  initials: string;
  jobs: number;
  success: number;
  rating: string;
  ratingColor: string;
}

// --- Mock Data ---

const kpiData: KPI[] = [
  {
    id: "1",
    label: "Total Jobs",
    value: "1,240",
    change: "+12%",
    trend: "up",
    icon: "Jobs",
    iconColor: "text-primary", // Using generic tailwind for specific brand colors usually allowed if semantic doesn't cover charts
    accentColor: "bg-blue-500/10",
  },
  {
    id: "2",
    label: "Completion Rate",
    value: "88%",
    change: "+5%",
    trend: "up",
    icon: "CircleCheck",
    iconColor: "text-primary",
    accentColor: "bg-primary/10",
  },
  {
    id: "3",
    label: "Pending Pay",
    value: "45",
    change: "-2%",
    trend: "down",
    icon: "CircleDollarSign",
    iconColor: "text-orange-500",
    accentColor: "bg-orange-500/10",
  },
];

const contractors: Contractor[] = [
  {
    id: "1",
    name: "John Doe",
    initials: "JD",
    jobs: 45,
    success: 98,
    rating: "A+",
    ratingColor: "text-primary",
  },
  {
    id: "2",
    name: "Jane Smith",
    initials: "JS",
    jobs: 42,
    success: 96,
    rating: "A",
    ratingColor: "text-primary",
  },
  {
    id: "3",
    name: "Robert Fox",
    initials: "RF",
    jobs: 38,
    success: 94,
    rating: "A-",
    ratingColor: "text-primary/80",
  },
];

const weeklyData = [
  { label: "Wk 1", height: "h-[40%]", value: "$12k" },
  { label: "Wk 2", height: "h-[65%]", value: "$24k" },
  { label: "Wk 3", height: "h-[50%]", value: "$18k" },
  { label: "This Wk", height: "h-[85%]", value: "$32k", active: true },
];

// --- Main Screen Component ---

export function JobAnalyticsScreen() {
  return (
    <SafeArea>
      <View className="flex-1">
        {/* Header Section */}
        <Header />

        {/* Scrollable Main Content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <DateFilter />
          <KPISection />
          <JobStatusChart />
          <WeeklyPayoutsChart />
          <ContractorsList />
        </ScrollView>

        {/* Floating Export Button */}
        <View className="absolute bottom-24 right-4 z-40">
          <Pressable className="flex-row items-center gap-2 bg-primary px-5 py-3 rounded-full shadow-lg active:opacity-90">
            <Icon name="Share" size={20} color="#000" />
            <Text className="text-black font-bold text-sm">Export Report</Text>
          </Pressable>
        </View>

        {/* Bottom Navigation */}
        <JobAdminNavs />
      </View>
    </SafeArea>
  );
}

// --- Sub-components ---

function Header() {
  return (
    <View className="flex-row items-center   px-4 py-4 bg-background border-b border-border z-10">
      <View className="flex-row items-center gap-3">
        {/* User Avatar */}
        <View className="relative">
          <View className="h-10 w-10 rounded-full bg-muted items-center justify-center overflow-hidden border border-border">
            <Text className="text-foreground font-bold text-sm">AD</Text>
          </View>
          <View className="absolute bottom-0 right-0 h-3 w-3 bg-primary rounded-full border-2 border-background" />
        </View>

        {/* Greeting */}
        <View>
          <Text className="text-foreground font-bold text-base">Analytics</Text>
          <Text className="text-muted-foreground text-xs">
            Welcome back, Admin
          </Text>
        </View>
      </View>
      <View className="flex-1" />
      <ThemeToggle />
      {/* Notification Bell */}
      <Pressable className="p-2 rounded-full hover:bg-muted active:bg-muted">
        <Icon name="Bell" className="text-foreground size-24" />
        <View className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full" />
      </Pressable>
    </View>
  );
}

function DateFilter() {
  return (
    <View className="px-4 py-4">
      <Pressable className="flex-row items-center self-start gap-2 px-4 py-2 bg-card rounded-full border border-border active:opacity-80">
        <Icon name="Calendar" className="text-primary size-18" />
        <Text className="text-foreground text-sm font-medium">Last 7 Days</Text>
        <Icon name="ChevronDown" className="text-muted-foreground size-18" />
      </Pressable>
    </View>
  );
}

function KPISection() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
      className="mb-6"
    >
      {kpiData.map((item) => (
        <View
          key={item.id}
          className="min-w-40 p-4 rounded-2xl bg-card border border-border flex-col justify-between"
        >
          <View className="flex-row justify-between items-start mb-4">
            <View
              className={`p-2 rounded-lg ${item.accentColor || "bg-muted"}`}
            >
              <Icon
                name={item.icon}
                // size={20}
                className={cn(item.iconColor || "text-foreground", "size-20")}
              />
            </View>
            <View
              className={`flex-row items-center px-1.5 py-0.5 rounded-md ${
                item.trend === "up" ? "bg-primary/10" : "bg-destructive/10"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  item.trend === "up" ? "text-primary" : "text-destructive"
                }`}
              >
                {item.change}
              </Text>
              {item.trend === "up" ? (
                <Icon name="TrendingUp" className="size-12 ml-1 text-primary" />
              ) : (
                <Icon
                  name="TrendingDown"
                  className="size-12 ml-1 text-destructive"
                />
              )}
            </View>
          </View>
          <View>
            <Text className="text-muted-foreground text-xs font-medium">
              {item.label}
            </Text>
            <Text className="text-foreground text-2xl font-bold mt-1">
              {item.value}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function JobStatusChart() {
  return (
    <View className="px-4 mb-6">
      <View className="p-5 rounded-2xl bg-card border border-border">
        {/* Header */}
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Text className="text-foreground text-lg font-bold">
              Job Status
            </Text>
            <Text className="text-muted-foreground text-xs">
              Distribution of current workflow
            </Text>
          </View>
          <Pressable className="p-1 rounded hover:bg-muted/20">
            <Icon name="MoreHoriz" className="text-muted-foreground size-20" />
          </Pressable>
        </View>

        {/* Progress Bar */}
        <View className="flex-col gap-4">
          <View className="h-4 w-full flex-row rounded-full overflow-hidden bg-muted">
            <View className="h-full bg-blue-500 w-[40%]" />
            <View className="h-full bg-primary w-[45%]" />
            <View className="h-full bg-destructive w-[15%]" />
          </View>

          {/* Legend */}
          <View className="flex-row justify-between">
            <View className="flex-col gap-1">
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-blue-500" />
                <Text className="text-muted-foreground text-xs font-medium">
                  Assigned
                </Text>
              </View>
              <Text className="text-foreground text-sm font-bold pl-4">
                480
              </Text>
            </View>

            <View className="flex-col gap-1 border-l border-border pl-4">
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-primary" />
                <Text className="text-muted-foreground text-xs font-medium">
                  Approved
                </Text>
              </View>
              <Text className="text-foreground text-sm font-bold pl-4">
                540
              </Text>
            </View>

            <View className="flex-col gap-1 border-l border-border pl-4">
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-destructive" />
                <Text className="text-muted-foreground text-xs font-medium">
                  Rejected
                </Text>
              </View>
              <Text className="text-foreground text-sm font-bold pl-4">
                180
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function WeeklyPayoutsChart() {
  return (
    <View className="px-4 mb-6">
      <View className="p-5 rounded-2xl bg-card border border-border">
        {/* Header */}
        <View className="flex-row justify-between items-start mb-4">
          <View>
            <Text className="text-foreground text-lg font-bold">
              Weekly Payouts
            </Text>
            <Text className="text-muted-foreground text-xs">
              Total: <Text className="text-primary font-bold">$45k Paid</Text>
            </Text>
          </View>
          <View className="flex-row items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
            <Icon name="TrendingUp" size={14} className="text-primary" />
            <Text className="text-primary text-xs font-bold">+15%</Text>
          </View>
        </View>

        {/* Chart Area */}
        <View className="h-40 w-full mt-4 justify-end">
          <View className="flex-1 flex-row items-end justify-between gap-2 border-b border-border pb-2">
            {weeklyData.map((item, index) => (
              <View key={index} className="flex-1 items-center gap-1 group">
                {/* Bar */}
                <View
                  className={`w-full rounded-t-sm ${
                    item.active ? "bg-primary" : "bg-primary/30"
                  } ${item.height}`}
                />
              </View>
            ))}
          </View>

          {/* X Axis Labels */}
          <View className="flex-row justify-between mt-2 px-1">
            {weeklyData.map((item, index) => (
              <Text
                key={index}
                className={`text-xs w-full text-center ${
                  item.active
                    ? "text-primary font-bold"
                    : "text-muted-foreground font-medium"
                }`}
              >
                {item.label}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function ContractorsList() {
  return (
    <View className="px-4 pb-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-foreground text-lg font-bold">
          Top Contractors
        </Text>
        <Pressable>
          <Text className="text-primary text-sm font-medium">View All</Text>
        </Pressable>
      </View>

      <View className="gap-3">
        {contractors.map((contractor) => (
          <View
            key={contractor.id}
            className="flex-row items-center justify-between p-3 rounded-xl bg-card border border-border shadow-sm"
          >
            <View className="flex-row items-center gap-3">
              {/* Avatar using Initials */}
              <View className="h-10 w-10 rounded-full bg-muted items-center justify-center border border-border">
                <Text className="text-muted-foreground font-bold text-sm">
                  {contractor.initials}
                </Text>
              </View>
              <View>
                <Text className="text-foreground text-sm font-bold">
                  {contractor.name}
                </Text>
                <Text className="text-muted-foreground text-xs">
                  {contractor.jobs} Jobs • {contractor.success}% Success
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className={`text-sm font-bold ${contractor.ratingColor}`}>
                {contractor.rating}
              </Text>
              <Text className="text-muted-foreground text-[10px]">Rating</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
