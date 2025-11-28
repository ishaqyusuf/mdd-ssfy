import { Text } from "@/components/ui/text";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { FlatList, TouchableOpacity, View } from "react-native";
import { useJobOverviewStore } from "../../../stores/use-job-overview-store";
import { DetailedJob } from "../job-overview/types";

type RecentJobsProps = {
  jobs: DetailedJob[];
};

const statusStyles: { [key: string]: { container: string; text: string } } = {
  Completed: {
    container: "bg-green-100 dark:bg-green-900",
    text: "text-green-800 dark:text-green-200",
  },
  "In Progress": {
    container: "bg-yellow-100 dark:bg-yellow-900",
    text: "text-yellow-800 dark:text-yellow-200",
  },
  Submitted: {
    container: "bg-blue-100 dark:bg-blue-900",
    text: "text-blue-800 dark:text-blue-200",
  },
  "Pending Submission": {
    container: "bg-red-100 dark:bg-red-900",
    text: "text-red-800 dark:text-red-200",
  },
};

export function RecentJobs({ jobs }: RecentJobsProps) {
  const { colorScheme } = useColorScheme();
  const { openModal } = useJobOverviewStore((s) => s.actions);

  const renderItem = ({ item }: { item: DetailedJob }) => {
    const style = statusStyles[item.jobStatus] || {
      container: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-800 dark:text-gray-200",
    };
    return (
      <TouchableOpacity
        className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-sm dark:border dark:border-gray-700/80 mb-3 flex-row items-center"
        onPress={() => openModal(item)}
      >
        <View className="flex-1 pr-4">
          <Text
            className="text-base font-semibold text-gray-800 dark:text-gray-200"
            numberOfLines={1}
          >
            {item.project.name}
          </Text>
          <View className="flex-row items-center mt-1.5">
            <MaterialIcons
              name="location-on"
              size={14}
              color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
            />
            <Text
              className="text-sm text-gray-600 dark:text-gray-400 ml-1 flex-shrink"
              numberOfLines={1}
            >
              {item.unit.name}
            </Text>
          </View>
        </View>
        <View className={`px-3 py-1.5 rounded-full ${style.container}`}>
          <Text className={`text-xs font-medium ${style.text}`}>
            {item.jobStatus}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-bold text-gray-800 dark:text-gray-200">
          Recent Jobs
        </Text>
        <TouchableOpacity>
          <Text className="text-sm font-medium text-primary-medium-blue">
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
