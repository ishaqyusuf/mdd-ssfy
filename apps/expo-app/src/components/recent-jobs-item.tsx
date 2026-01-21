import React from "react";
import { View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/use-color";
import { Text } from "@/components/ui/text";
import { useJobOverviewStore } from "@/stores/use-job-overview-store";

type RecentJobsItemProps = {
  job: any;
};

const statusColors: { [key: string]: string } = {
  Completed: "#10B981",
  "In Progress": "#F59E0B",
  Submitted: "#3B82F6",
  "Pending Submission": "#EF4444",
};

export function RecentJobsItem({ job }: RecentJobsItemProps) {
  const { colorScheme } = useColorScheme();
  const { openModal } = useJobOverviewStore((s) => s.actions);

  const statusColor = statusColors[job.jobStatus] || "#6B7280";

  return (
    <TouchableOpacity
      className="bg-white dark:bg-gray-800/50 rounded-xl overflow-hidden shadow-md shadow-gray-200/50 dark:shadow-none border border-gray-200/80 dark:border-gray-700/60 mb-3"
      onPress={() => openModal(job)}
    >
      <View className="flex-row">
        <View style={{ backgroundColor: statusColor, width: 6 }} />
        <View className="p-4 flex-1">
          <View className="flex-row justify-between items-center">
            <Text
              className="text-base font-bold text-gray-800 dark:text-gray-100"
              numberOfLines={1}
            >
              {job.project.name}
            </Text>
            <Text
              className="text-xs font-semibold"
              style={{ color: statusColor }}
            >
              {job.jobStatus}
            </Text>
          </View>
          <View className="flex-row items-center mt-1">
            <MaterialIcons
              name="location-on"
              size={14}
              color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
            />
            <Text
              className="text-sm text-gray-500 dark:text-gray-400 ml-1.5"
              numberOfLines={1}
            >
              {job.unit.name}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
