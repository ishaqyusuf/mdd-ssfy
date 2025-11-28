import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

type JobAnalyticsProps = {
  completed: number;
  inProgress: number;
  paid: number;
  pendingPayments: number;
};

export function JobAnalytics({ completed, inProgress, paid, pendingPayments }: JobAnalyticsProps) {
  return (
    <View>
        <Text className="text-xl font-bold text-gray-800 mb-4">Job Analytics</Text>
        <View className="flex-row flex-wrap -mx-2">
            <AnalyticsCard
                title="Completed"
                value={completed}
                iconName="check-circle"
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
                iconName="attach-money"
                color="#3B82F6"
            />
            <AnalyticsCard
                title="Pending Payments"
                value={pendingPayments}
                iconName="payment"
                color="#EF4444"
            />
        </View>
    </View>
  );
}

type AnalyticsCardProps = {
    title: string;
    value: number;
    iconName: keyof typeof MaterialIcons.glyphMap;
    color: string;
}

const AnalyticsCard = ({ title, value, iconName, color }: AnalyticsCardProps) => (
    <View className="w-1/2 p-2">
        <View className="bg-white p-4 rounded-xl shadow-sm border-l-4" style={{ borderLeftColor: color }}>
            <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-gray-500">{title}</Text>
                <MaterialIcons name={iconName} size={22} color={color} />
            </View>
            <Text className="text-3xl font-bold text-gray-800 mt-2">{value}</Text>
        </View>
    </View>
);
