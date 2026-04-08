import { useColorScheme } from "@/hooks/use-color";
import { useQuery } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { Icon, type IconKeys } from "@/components/ui/icon";
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
        <Icon
          name="PieChart"
          size={22}
          color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
        />
        <Text className="text-xl font-bold ml-2">Job Analytics</Text>
      </View>
      <View className="flex-row flex-wrap -mx-2">
        <AnalyticsCard
          title="Submitted"
          value={inProgress}
          iconName="Hourglass"
          color="#F59E0B"
        />
        <AnalyticsCard
          title="Completed"
          value={completed}
          iconName="CircleCheck"
          color="#10B981"
        />
        <AnalyticsCard
          title="Paid"
          value={paid}
          iconName="CreditCard"
          color="#3B82F6"
        />
        <AnalyticsCard
          title="Pending Payments"
          value={pendingPayments}
          iconName="ReceiptText"
          color="#EF4444"
        />
      </View>
    </View>
  );
}

type AnalyticsCardProps = {
  title: string;
  value: string | number | undefined;
  iconName: IconKeys;
  color: string;
};
const AnalyticsCard = ({
  title,
  value,
  iconName,
  color,
}: AnalyticsCardProps) => (
  <View className="w-1/2 p-2">
    <View className="border p-5 rounded-2xl shadow-lg shadow-gray-200/70 dark:shadow-none border-muted-foreground bg-muted">
      <View className="flex-row justify-between items-start">
        <Text className="text-4xl font-extrabold -tracking-tight">{value}</Text>
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: `${color}25` }}
        >
          <Icon name={iconName} size={22} color={color} />
        </View>
      </View>
      <Text className="text-base font-semibold mt-2" color="secondary">
        {title}
      </Text>
    </View>
  </View>
);
