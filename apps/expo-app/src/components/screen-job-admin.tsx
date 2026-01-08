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

/**
 * REUSABLE ICON COMPONENT
 * Maps Lucide icons to a consistent interface.
 */
// const ICON_MAP = {
//   Bell,
//   Hourglass,
//   CheckSquare,
//   BarChart3,
//   Briefcase,
//   Gavel,
//   Users,
//   ChevronRight,
//   XCircle,
//   LayoutDashboard,
//   List,
//   Settings,
//   User,
//   Activity,
//   UserCog,
// };

/**
 * DATA MOCKS
 */
const QUICK_ACTIONS = [
  {
    id: 1,
    title: "Manage\nJobs",
    icon: "Briefcase",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "Approve/\nReject Jobs",
    icon: "Gavel",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2370&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "User\nManagement",
    icon: "UserCog",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2370&auto=format&fit=crop",
  },
];

const RECENT_JOBS: {
  id;
  title;
  status;
  statusColor;
  iconBg;
  iconColor;
  icon: IconProps["name"];
}[] = [
  {
    id: 1,
    title: "Kitchen Renovation",
    status: "Approval Requested",
    statusColor: "bg-amber-500",
    iconBg: "bg-amber-500/10",
    iconColor: "#f59e0b",
    icon: "Hourglass",
  },
  {
    id: 2,
    title: "Plumbing Fix",
    status: "Assigned to Mike S.",
    statusColor: "bg-blue-500",
    iconBg: "bg-blue-500/10",
    iconColor: "#3b82f6",
    icon: "User",
  },
  {
    id: 3,
    title: "Electrical Wiring",
    status: "Rejected",
    statusColor: "bg-red-500",
    iconBg: "bg-red-500/10",
    iconColor: "#ef4444",
    icon: "XCircle",
  },
];

export default function DashboardScreen() {
  return (
    <SafeArea>
      {/* <StatusBar barStyle="light-content" /> */}

      {/* HEADER */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-800/50">
        <View className="flex-row items-center gap-3">
          {/* Avatar (Initials) */}
          <View className="h-11 w-11 rounded-full bg-slate-800 items-center justify-center border-2 border-slate-700 relative">
            <Text className="text-white font-bold text-sm">JD</Text>
            <View className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-slate-950" />
          </View>

          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Dashboard
            </Text>
            <Text className="text-lg font-bold text-white">Admin Overview</Text>
          </View>
        </View>

        <Pressable className="h-10 w-10 rounded-full bg-slate-900 items-center justify-center border border-slate-800">
          <Icon name="Bell" size={20} className="text-slate-400" />
          <View className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full border border-slate-900" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="p-5 gap-6">
          {/* TOP STATS GRID */}
          <View className="flex-row gap-4">
            {/* Card 1: Pending */}
            <View className="flex-1 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
              <View className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full blur-xl" />
              <View className="flex-row items-center gap-2 mb-4 z-10">
                <View className="h-8 w-8 rounded-lg bg-orange-500/10 items-center justify-center">
                  <Icon name="Hourglass" size={16} color="#f97316" />
                </View>
                <Text className="text-xs font-semibold text-slate-400">
                  Pending
                </Text>
              </View>
              <View className="z-10">
                <Text className="text-3xl font-bold text-white">12</Text>
                <Text className="text-xs text-slate-500 mt-1">
                  Jobs awaiting review
                </Text>
              </View>
            </View>

            {/* Card 2: Approvals */}
            <View className="flex-1 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
              <View className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl" />
              <View className="flex-row items-center gap-2 mb-4 z-10">
                <View className="h-8 w-8 rounded-lg bg-blue-500/10 items-center justify-center">
                  <Icon name="CheckSquare" size={16} color="#3b82f6" />
                </View>
                <Text className="text-xs font-semibold text-slate-400">
                  Approvals
                </Text>
              </View>
              <View className="z-10">
                <Text className="text-3xl font-bold text-white">5</Text>
                <Text className="text-xs text-slate-500 mt-1">
                  Needs action
                </Text>
              </View>
            </View>
          </View>

          {/* ACTIVE JOBS SUMMARY (Large Card) */}
          <View className="w-full bg-blue-600 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            {/* Background Decor */}
            <View className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

            <View className="flex-row justify-between items-end">
              <View className="z-10 flex-1">
                <View className="flex-row items-center gap-2 mb-2">
                  <Icon
                    name="Activity"
                    size={18}
                    color="rgba(255,255,255,0.8)"
                  />
                  <Text className="text-sm font-medium text-white/90">
                    Active Jobs Summary
                  </Text>
                </View>
                <Text className="text-4xl font-bold text-white">34</Text>
                <Text className="text-xs text-white/60 mt-1">
                  Jobs currently in progress
                </Text>
              </View>

              {/* CSS Bar Chart Simulation */}
              <View className="flex-row items-end h-12 gap-1.5 z-10">
                <View className="w-1.5 bg-white/20 h-[40%] rounded-t-sm" />
                <View className="w-1.5 bg-white/40 h-[70%] rounded-t-sm" />
                <View className="w-1.5 bg-white/30 h-[50%] rounded-t-sm" />
                <View className="w-1.5 bg-white/60 h-[85%] rounded-t-sm" />
                <View className="w-1.5 bg-white h-full rounded-t-sm shadow-sm" />
              </View>
            </View>
          </View>

          {/* QUICK ACTIONS */}
          <View>
            <Text className="text-lg font-bold text-white mb-4">
              Quick Actions
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 20 }}
            >
              {QUICK_ACTIONS.map((action) => (
                <Pressable
                  key={action.id}
                  className="w-36 h-28 rounded-2xl overflow-hidden relative active:opacity-90"
                >
                  <Image
                    source={{ uri: action.image }}
                    className="absolute inset-0 w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-slate-950/60" />
                  <View className="absolute inset-0 p-4 justify-end">
                    <View className="h-8 w-8 rounded-full bg-white/20 items-center justify-center mb-2 backdrop-blur-sm">
                      <Icon name={action.icon as any} size={14} color="white" />
                    </View>
                    <Text className="text-white font-semibold text-sm leading-tight">
                      {action.title}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* RECENT JOBS */}
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-white">Recent Jobs</Text>
              <Pressable className="bg-blue-500/10 px-3 py-1.5 rounded-full">
                <Text className="text-blue-500 text-xs font-semibold">
                  See All
                </Text>
              </Pressable>
            </View>

            <View className="gap-3">
              {RECENT_JOBS.map((job) => (
                <Pressable
                  key={job.id}
                  className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex-row items-center gap-4 active:bg-slate-800 transition-colors"
                >
                  <View
                    className={`h-10 w-10 rounded-full items-center justify-center shrink-0 ${job.iconBg}`}
                  >
                    <Icon
                      name={job.icon as any}
                      size={20}
                      color={job.iconColor}
                    />
                  </View>

                  <View className="flex-1">
                    <Text
                      className="text-white font-semibold text-sm"
                      numberOfLines={1}
                    >
                      {job.title}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-1">
                      <View
                        className={`h-1.5 w-1.5 rounded-full ${job.statusColor}`}
                      />
                      <Text
                        className="text-slate-400 text-xs"
                        numberOfLines={1}
                      >
                        {job.status}
                      </Text>
                    </View>
                  </View>

                  <Icon
                    name="ChevronRight"
                    size={20}
                    className="text-slate-600"
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <JobAdminNavs />
    </SafeArea>
  );
}
