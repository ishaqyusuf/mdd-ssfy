import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Icon } from "../ui/icon";
import { ThemeToggle } from "../theme-toggle";
import { JobAdminNavs } from "./job-admin-navs";

export default function DashboardExampleScreen() {
  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-14 pb-4 bg-background/95 border-b border-border sticky top-0 z-10">
        <View className="flex-row items-center gap-3">
          <View className="relative">
            <View className="h-11 w-11 rounded-full bg-muted items-center justify-center border-2 border-card shadow-sm overflow-hidden">
              <Text className="text-lg font-bold text-muted-foreground">
                AO
              </Text>
            </View>
            <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-primary border-2 border-background" />
          </View>
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dashboard
            </Text>
            <Text className="text-lg font-bold text-foreground leading-tight">
              Admin Overview
            </Text>
          </View>
        </View>
        <View className="flex-1" />
        <Pressable className="relative h-10 w-10 items-center justify-center rounded-full active:bg-secondary">
          <Icon name="Bell" className="text-muted-foreground" size={24} />
          <View className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        </Pressable>
        <ThemeToggle />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        {/* Stats Grid */}
        <View className="flex-row flex-wrap gap-4 mb-8">
          {/* Pending Card */}
          <View className="flex-1 min-w-[45%] bg-card p-4 rounded-2xl border border-border shadow-sm justify-between h-32 relative overflow-hidden">
            <View className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-accent/10 blur-xl" />
            <View className="flex-row items-center gap-2 z-10">
              <View className="h-8 w-8 rounded-lg bg-accent/20 items-center justify-center">
                <Icon
                  name="Hourglass"
                  className="text-accent-foreground"
                  size={18}
                />
              </View>
              <Text className="text-xs font-semibold text-muted-foreground">
                Pending
              </Text>
            </View>
            <View className="z-10">
              <Text className="text-3xl font-bold text-foreground">12</Text>
              <Text className="text-xs text-muted-foreground mt-1">
                Jobs awaiting review
              </Text>
            </View>
          </View>

          {/* Approvals Card */}
          <View className="flex-1 min-w-[45%] bg-card p-4 rounded-2xl border border-border shadow-sm justify-between h-32 relative overflow-hidden">
            <View className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-xl" />
            <View className="flex-row items-center gap-2 z-10">
              <View className="h-8 w-8 rounded-lg bg-primary/20 items-center justify-center">
                <Icon
                  name="ClipboardCheck"
                  className="text-primary"
                  size={18}
                />
              </View>
              <Text className="text-xs font-semibold text-muted-foreground">
                Approvals
              </Text>
            </View>
            <View className="z-10">
              <Text className="text-3xl font-bold text-foreground">5</Text>
              <Text className="text-xs text-muted-foreground mt-1">
                Needs action
              </Text>
            </View>
          </View>

          {/* Active Jobs Summary */}
          <View className="w-full bg-primary rounded-2xl p-5 shadow-sm flex-row items-center justify-between relative overflow-hidden">
            <View className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-background/10 blur-2xl" />
            <View className="z-10 gap-1">
              <View className="flex-row items-center gap-2 mb-2">
                <Icon
                  name="HardHat"
                  className="text-primary-foreground/80"
                  size={20}
                />
                <Text className="text-sm font-medium text-primary-foreground/90">
                  Active Jobs Summary
                </Text>
              </View>
              <Text className="text-4xl font-bold text-primary-foreground">
                34
              </Text>
              <Text className="text-xs text-primary-foreground/60">
                Jobs currently in progress
              </Text>
            </View>
            {/* Simple Bar Chart Visual */}
            <View className="flex-row gap-1 items-end h-12 z-10">
              <View className="w-1.5 bg-primary-foreground/20 h-[40%] rounded-t-sm" />
              <View className="w-1.5 bg-primary-foreground/40 h-[70%] rounded-t-sm" />
              <View className="w-1.5 bg-primary-foreground/30 h-[50%] rounded-t-sm" />
              <View className="w-1.5 bg-primary-foreground/60 h-[85%] rounded-t-sm" />
              <View className="w-1.5 bg-primary-foreground h-full rounded-t-sm shadow-sm" />
            </View>
          </View>

          {/* Assign New Job Button */}
          <Pressable className="w-full relative overflow-hidden rounded-2xl bg-secondary active:bg-secondary/90 border border-border p-5 shadow-sm flex-row items-center justify-between">
            <View className="absolute right-0 top-0 h-32 w-32 bg-primary/5 rounded-full -mr-10 -mt-10 blur-2xl" />
            <View className="z-10">
              <Text className="text-lg font-bold text-secondary-foreground leading-tight">
                Assign New Job
              </Text>
              <Text className="text-muted-foreground text-xs mt-1">
                Dispatch contractor to a new site
              </Text>
            </View>
            <View className="z-10 h-10 w-10 rounded-full bg-background/50 items-center justify-center">
              <Icon name="Plus" className="text-foreground" size={24} />
            </View>
          </Pressable>
        </View>

        {/* Recent Jobs */}
        <View className="gap-4">
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-lg font-bold text-foreground">
              Recent Jobs
            </Text>
            <Pressable className="px-3 py-1.5 rounded-full bg-primary/10 active:bg-primary/20">
              <Text className="text-xs font-semibold text-primary">
                See All
              </Text>
            </Pressable>
          </View>

          <JobCard
            title="Kitchen Renovation"
            id="#3049"
            time="2h ago"
            status="Approval Requested"
            statusColor="text-accent-foreground"
            dotColor="bg-accent-foreground"
            icon="Clock"
            iconBg="bg-accent/20"
            iconColor="text-accent-foreground"
            showActions={true}
          />
          <JobCard
            title="Plumbing Fix"
            id="#3042"
            time="5h ago"
            status="Assigned to Mike S."
            statusColor="text-primary"
            dotColor="bg-primary"
            icon="UserCheck"
            iconBg="bg-primary/20"
            iconColor="text-primary"
            showActions={false}
          />
          <JobCard
            title="Electrical Wiring"
            id="#3018"
            time="Yesterday"
            status="Rejected"
            statusColor="text-destructive"
            dotColor="bg-destructive"
            icon="XCircle"
            iconBg="bg-destructive/20"
            iconColor="text-destructive"
            showActions={false}
          />
        </View>
      </ScrollView>
      <JobAdminNavs />
    </View>
  );
}

function JobCard({
  title,
  id,
  time,
  status,
  statusColor,
  dotColor,
  icon,
  iconBg,
  iconColor,
  showActions,
}: any) {
  return (
    <View className="bg-card p-4 rounded-xl border border-border shadow-sm gap-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-row items-center gap-3.5 flex-1 overflow-hidden">
          <View
            className={`h-10 w-10 rounded-full ${iconBg} items-center justify-center shrink-0`}
          >
            <Icon name={icon} className={iconColor} size={20} />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-foreground font-bold text-sm truncate">
              {title}
            </Text>
            <Text className="text-muted-foreground text-xs mt-0.5">{`Request ${id} • ${time}`}</Text>
            <View className="flex-row items-center gap-1.5 mt-1.5">
              <View className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
              <Text className={`${statusColor} text-xs font-medium truncate`}>
                {status}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-row gap-2 pt-3 border-t border-border mt-1">
        <Pressable className="flex-1 h-9 items-center justify-center rounded-lg border border-transparent active:bg-muted/10">
          <Text className="text-xs font-semibold text-muted-foreground">
            Details
          </Text>
        </Pressable>
        {showActions ? (
          <>
            <Pressable className="flex-1 h-9 flex-row items-center justify-center gap-1.5 rounded-lg bg-destructive/10 active:bg-destructive/20">
              <Icon name="X" className="text-destructive" size={16} />
              <Text className="text-xs font-semibold text-destructive">
                Reject
              </Text>
            </Pressable>
            <Pressable className="flex-1 h-9 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary/10 active:bg-primary/20">
              <Icon name="Check" className="text-primary" size={16} />
              <Text className="text-xs font-semibold text-primary">
                Approve
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <View className="flex-1 h-9 items-center justify-center rounded-lg border border-border opacity-50">
              <Text className="text-xs font-semibold text-muted-foreground">
                Reject
              </Text>
            </View>
            <View className="flex-1 h-9 items-center justify-center rounded-lg border border-border opacity-50">
              <Text className="text-xs font-semibold text-muted-foreground">
                Approve
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
