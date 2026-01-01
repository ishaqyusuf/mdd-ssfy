import { Icon, IconProps } from "@/components/ui/icon";
import React from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// All components are in this file as per the instructions.

const JobsHeader = () => (
  <View className="sticky top-0 z-20 bg-background px-4 pt-12 pb-4">
    <View className="flex-row items-center justify-between">
      <Text className="text-foreground text-3xl font-bold leading-tight tracking-tight">
        All Jobs
      </Text>
      <TouchableOpacity className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
        <Icon name="Plus" className="text-primary" size={28} />
      </TouchableOpacity>
    </View>
  </View>
);

const SearchBar = () => (
  <View className="px-4 py-4">
    <View className="flex-row w-full items-center rounded-full bg-card border border-border px-4 h-14">
      <Icon name="Search" className="text-muted-foreground mr-3" />
      <TextInput
        className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground focus:ring-0 p-0 text-base font-normal leading-normal"
        placeholder="Search by project or client"
      />
      <TouchableOpacity className="ml-2 p-2 rounded-full">
        <Icon name="SlidersHorizontal" className="text-primary" size={20} />
      </TouchableOpacity>
    </View>
  </View>
);

const FilterChip = ({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) => (
  <TouchableOpacity
    className={`flex h-10 items-center justify-center px-6 rounded-full border transition-transform active:scale-95 ${
      active ? "bg-primary border-primary" : "bg-card border-border"
    }`}
  >
    <Text
      className={`text-sm leading-normal ${
        active
          ? "font-bold text-primary-foreground"
          : "font-medium text-muted-foreground"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const FilterChips = () => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerClassName="gap-3 px-4 min-w-max"
    className="pb-2"
  >
    <FilterChip label="All" active />
    <FilterChip label="Active" />
    <FilterChip label="Pending Payment" />
    <FilterChip label="Completed" />
  </ScrollView>
);

const JobCard = ({
  icon,
  title,
  subtitle,
  status,
  date,
  amount,
  statusIcon,
  statusColor,
  iconBgColor,
  opacityClass = "opacity-100",
}: {
  icon: IconProps["name"];
  title: string;
  subtitle: string;
  status: string;
  date: string;
  amount: string;
  statusIcon: IconProps["name"];
  statusColor: string;
  iconBgColor: string;
  opacityClass?: string;
}) => (
  <TouchableOpacity
    className={`group relative flex flex-col gap-3 bg-card p-5 rounded-[2rem] border border-border active:scale-[0.98] transition-all ${opacityClass}`}
  >
    <View className="flex-row justify-between items-start">
      <View className="flex-row gap-4">
        <View
          className={`flex items-center justify-center rounded-2xl shrink-0 h-14 w-14 ${iconBgColor}`}
        >
          <Icon name={icon} className={statusColor} size={28} />
        </View>
        <View className="flex flex-col justify-center">
          <Text className="text-foreground text-lg font-bold leading-tight mb-1">
            {title}
          </Text>
          <Text className="text-muted-foreground text-sm font-normal">
            {subtitle}
          </Text>
        </View>
      </View>
      <View className="flex flex-col items-end gap-1">
        <View
          className={`inline-flex items-center rounded-full px-2.5 py-1 ${iconBgColor}`}
        >
          <Text className={`text-xs font-bold ${statusColor}`}>{status}</Text>
        </View>
        <TouchableOpacity className="text-muted-foreground/80 mt-1">
          <Icon name="GripHorizontal" />
        </TouchableOpacity>
      </View>
    </View>
    <View className="w-full h-px bg-border my-1" />
    <View className="flex-row justify-between items-center">
      <View className="flex-row items-center gap-2 text-muted-foreground text-sm">
        <Icon name={statusIcon} size={18} />
        <Text>{date}</Text>
      </View>
      <Text className="text-foreground text-base font-bold">{amount}</Text>
    </View>
  </TouchableOpacity>
);

const DateHeader = ({ title }: { title: string }) => (
  <Text className="text-muted-foreground text-xs font-bold uppercase tracking-wider mt-2 ml-1">
    {title}
  </Text>
);

const BottomNav = () => (
  <View className="absolute bottom-0 z-30 w-full bg-background/80 border-t border-border pb-6 pt-2">
    <View className="flex-row justify-around items-center">
      <TouchableOpacity className="flex flex-col items-center gap-1 p-2">
        <Icon name="House" className="text-muted-foreground" />
        <Text className="text-[10px] font-medium text-muted-foreground">
          Home
        </Text>
      </TouchableOpacity>
      <TouchableOpacity className="flex flex-col items-center gap-1 p-2">
        <View className="bg-primary/20 px-4 py-0.5 rounded-full">
          <Icon name="Briefcase" className="text-primary" />
        </View>
        <Text className="text-[10px] font-bold text-primary">Jobs</Text>
      </TouchableOpacity>
      <TouchableOpacity className="flex flex-col items-center gap-1 p-2">
        <Icon name="CreditCard" className="text-muted-foreground" />
        <Text className="text-[10px] font-medium text-muted-foreground">
          Payments
        </Text>
      </TouchableOpacity>
      <TouchableOpacity className="flex flex-col items-center gap-1 p-2">
        <View className="relative">
          <Icon name="User" className="text-muted-foreground" />
          <View className="absolute top-0 right-0 h-2 w-2 bg-destructive rounded-full border-2 border-background" />
        </View>
        <Text className="text-[10px] font-medium text-muted-foreground">
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function Jobs2() {
  return (
    <View className="flex-1 bg-background">
      <JobsHeader />
      <ScrollView contentContainerClassName="pb-32">
        <SearchBar />
        <FilterChips />
        <View className="flex-1 flex flex-col gap-4 px-4 py-4">
          <DateHeader title="This Week" />
          <JobCard
            icon="LayoutGrid"
            title="Kitchen Renovation"
            subtitle="Smith Residence"
            status="In Progress"
            date="Oct 24, 2023"
            amount="$4,500.00"
            statusIcon="Calendar"
            statusColor="text-accent"
            iconBgColor="bg-accent/20"
          />
          <JobCard
            icon="Wind"
            title="HVAC Repair"
            subtitle="Downtown Office"
            status="Paid"
            date="Oct 20, 2023"
            amount="$850.00"
            statusIcon="CheckCircle"
            statusColor="text-primary"
            iconBgColor="bg-primary/20"
          />
          <DateHeader title="Previous Month" />
          <JobCard
            icon="Fence"
            title="Deck Installation"
            subtitle="142 Maple Ave"
            status="Unpaid"
            date="Sep 28, 2023"
            amount="$12,200.00"
            statusIcon="Clock"
            statusColor="text-destructive"
            iconBgColor="bg-destructive/20"
          />
          <JobCard
            icon="Wrench"
            title="Bathroom Plumbing"
            subtitle="Westside Apartments"
            status="Completed"
            date="Sep 15, 2023"
            amount="$650.00"
            statusIcon="CalendarCheck"
            statusColor="text-muted-foreground"
            iconBgColor="bg-muted"
            opacityClass="opacity-80"
          />
        </View>
      </ScrollView>
      {/* <BottomNav /> */}
    </View>
  );
}
