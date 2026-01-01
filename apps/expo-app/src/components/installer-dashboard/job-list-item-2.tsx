import { getColorFromName } from "@gnd/utils/colors";
import { JobItem } from "./recent-jobs";
import { formatDate } from "@gnd/utils/dayjs";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "../ui/icon";

export function JobListItem2({ item }: { item: JobItem }) {
  const router = useRouter();
  const statusColor = getColorFromName(item.status) || "#6B7280";
  const date = formatDate(item.createdAt);
  const amount = item.amount ? `$${item.amount.toFixed(2)}` : "N/A";
  return (
    <TouchableOpacity
      className="group relative flex flex-col gap-3 bg-card p-5 rounded-4xl border border-border active:scale-[0.98] transition-all mb-4"
      onPress={() => {
        // openModal(item);
        router.push(`/(installers)/overview/${item.id}`);
      }}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-row gap-4">
          <View
            className={`flex items-center justify-center rounded-2xl shrink-0 h-14 w-14 bg-muted`}
          >
            <Icon
              name={"Briefcase"}
              className="text-muted-foreground"
              size={28}
            />
          </View>
          <View className="flex flex-col justify-center">
            <Text className="text-foreground text-lg font-bold leading-tight mb-1">
              {item.title}
            </Text>
            <Text
              numberOfLines={1}
              className="text-muted-foreground text-sm font-normal"
            >
              {/* {subtitle} */}
              {item.subtitle || item.description}
            </Text>
          </View>
        </View>
        <View className="flex flex-col items-end gap-1">
          <View className={`inline-flex items-center rounded-full px-2.5 py-1`}>
            {/* <Text className={`text-xs font-bold ${statusColor}`}>{status}</Text> */}
            <Text
              className="text-xs uppercase font-semibold"
              style={{ color: statusColor }}
            >
              {item.status}
            </Text>
          </View>
          {/* <TouchableOpacity className="text-muted-foreground/80 mt-1">
            <Icon name="GripHorizontal" />
          </TouchableOpacity> */}
        </View>
      </View>
      <View className="w-full border-t border-border  my-1" />
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center gap-2 text-muted-foreground text-sm">
          <Icon
            name={"Calendar1"}
            className="text-muted-foreground"
            size={18}
          />
          <Text className="text-foreground"> {date}</Text>
        </View>
        <Text className="text-foreground text-base font-bold">{amount}</Text>
      </View>
    </TouchableOpacity>
  );
}
