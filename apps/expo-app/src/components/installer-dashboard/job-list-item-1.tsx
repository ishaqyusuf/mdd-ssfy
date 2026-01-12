import { getColorFromName } from "@gnd/utils/colors";
import { JobItem } from "./recent-jobs";
import { formatDate } from "@gnd/utils/dayjs";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "../ui/icon";
import { _push } from "../static-router";

export function JobListItem1({ item }: { item: JobItem }) {
  const router = useRouter();
  const statusColor = getColorFromName(item.status) || "#6B7280";
  const date = formatDate(item.createdAt);
  const amount = item.amount ? `$${item.amount.toFixed(2)}` : "N/A";
  return (
    <TouchableOpacity
      className="bg-white dark:bg-gray-800/50 rounded-xl overflow-hidden shadow-md shadow-gray-200/50 dark:shadow-none border border-gray-200/80 dark:border-gray-700/60 mb-3"
      onPress={() => {
        // openModal(item);
        // _push(`/job-ov`)
        router.push(`/job-overview/${item.id}`);
      }}
    >
      <View className="flex-row">
        <View style={{ backgroundColor: statusColor, width: 6 }} />
        <View className="p-4 flex-1">
          <View className="flex-row justify-between items-center">
            <Text
              className="text-base font-bold text-gray-800 dark:text-gray-100"
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              className="text-xs uppercase font-semibold"
              style={{ color: statusColor }}
            >
              {item.status}
            </Text>
          </View>
          <View className="flex-row items-center mt-1">
            <Icon name="LocateIcon" className="size-14" />
            {/* <MaterialIcons
                    name="location-on"
                    size={14}
                    color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
                  /> */}
            <Text
              className="text-sm text-gray-500 dark:text-gray-400 ml-1.5"
              numberOfLines={1}
            >
              {item.subtitle || item.description}
              {/* {item.unit!.name} */}
            </Text>
          </View>
          <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-200/80 dark:border-gray-700/60">
            <View className="flex-row items-center">
              <Icon name="Calendar" className="size-14" />
              {/* <MaterialIcons
                      name="date-range"
                      size={14}
                      color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
                    /> */}
              <Text className="text-sm  text-gray-500 dark:text-gray-400 ml-1.5">
                {date}
              </Text>
            </View>
            <Text className="text-sm font-bold text-gray-800 dark:text-gray-100">
              {amount}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
