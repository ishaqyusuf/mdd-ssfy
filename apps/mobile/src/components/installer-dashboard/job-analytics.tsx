import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useQuery } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { View } from "@/components/ui/view";
import { Text } from "../ui/text";

export function JobAnalytics() {
  const { colorScheme } = useColorScheme();
  const { data } = useQuery(_trpc.jobs.getJobAnalytics.queryOptions({}));
  // if(isPending || )
  const { completed, inProgress, paid, pendingPayments } = data || {};

  return (
    <View>
      <View className="flex-row items-center mb-4">
        <MaterialIcons
          name="donut-large"
          size={22}
          color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
        />
        <Text className="text-xl font-bold ml-2">Job Analytics</Text>
      </View>
      <View className="flex-row flex-wrap -mx-2">
        <AnalyticsCard
          title="Completed"
          value={completed}
          iconName="check-circle-outline"
          color="#10B981"
        />
        <AnalyticsCard
          title="In Progress"
          value={inProgress}
          iconName="hourglass-empty"
          color="#F59E0B"
        />
        <AnalyticsCard
          title="Paid"
          value={paid}
          iconName="credit-card"
          color="#3B82F6"
        />
        <AnalyticsCard
          title="Pending Payments"
          value={pendingPayments}
          iconName="receipt-long"
          color="#EF4444"
        />
      </View>
    </View>
  );
}

type AnalyticsCardProps = {
  title: string;
  value: string | number | undefined;
  iconName: keyof typeof MaterialIcons.glyphMap;
  color: string;
};
const AnalyticsCard = ({
  title,
  value,
  iconName,
  color,
}: AnalyticsCardProps) => (
  <View className="w-1/2 p-2">
    <View className="bg-white dark:bg-gray-800/60 p-5 rounded-2xl shadow-lg shadow-gray-200/70 dark:shadow-none dark:border dark:border-gray-700/80">
      <View className="flex-row justify-between items-start">
        <Text className="text-4xl font-extrabold -tracking-tight">{value}</Text>
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: `${color}25` }}
        >
          <MaterialIcons name={iconName} size={22} color={color} />
        </View>
      </View>
      <Text className="text-base font-semibold mt-2" color="secondary">
        {title}
      </Text>
    </View>
  </View>
);
