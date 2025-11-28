import { Text } from "@/components/ui/text";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { FlatList, TouchableOpacity, View } from "react-native";
import { useJobOverviewStore } from "../../../stores/use-job-overview-store";
import { DetailedJob } from "../job-overview/types";

type RecentJobsProps = {
  jobs: DetailedJob[];
};

const statusColors: { [key: string]: string } = {
  Completed: "#10B981",
  "In Progress": "#F59E0B",
  Submitted: "#3B82F6",
  "Pending Submission": "#EF4444",
};

export function RecentJobs({ jobs }: RecentJobsProps) {
  const { colorScheme } = useColorScheme();
  const { openModal } = useJobOverviewStore((s) => s.actions);

  const renderItem = ({ item }: { item: DetailedJob }) => {
    const statusColor = statusColors[item.jobStatus] || "#6B7280";

    return (
      <TouchableOpacity
        className="bg-white dark:bg-gray-800/50 rounded-xl overflow-hidden shadow-md shadow-gray-200/50 dark:shadow-none border border-gray-200/80 dark:border-gray-700/60 mb-3"
        onPress={() => openModal(item)}
      >
        <View className="flex-row">
          <View style={{ backgroundColor: statusColor, width: 6 }} />
          <View className="p-4 flex-1">
            <View className="flex-row justify-between items-center">
              <Text
                className="text-base font-bold text-gray-800 dark:text-gray-100"
                numberOfLines={1}
              >
                {item.project.name}
              </Text>
              <Text
                className="text-xs font-semibold"
                style={{ color: statusColor }}
              >
                {item.jobStatus}
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
                {item.unit.name}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center">
          <MaterialIcons
            name="history"
            size={22}
            color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
          />
          <Text className="text-xl font-bold text-gray-800 dark:text-gray-100 ml-2">
            Recent Jobs
          </Text>
        </View>
        <TouchableOpacity className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg">
          <Text className="text-sm font-medium text-primary-medium-blue dark:text-sky-400">
            View All
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={jobs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
      />
    </View>
  );
}
