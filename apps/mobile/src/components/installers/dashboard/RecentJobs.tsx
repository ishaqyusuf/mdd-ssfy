import { MaterialIcons } from '@expo/vector-icons';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

type Job = {
  id: string;
  title: string;
  status: string;
  location: string;
};

type RecentJobsProps = {
  jobs: Job[];
};

const statusStyles: { [key: string]: { container: string, text: string } } = {
    'Completed': { container: 'bg-green-100', text: 'text-green-800' },
    'In Progress': { container: 'bg-yellow-100', text: 'text-yellow-800' },
    'Pending': { container: 'bg-red-100', text: 'text-red-800' },
};

export function RecentJobs({ jobs }: RecentJobsProps) {
  const renderItem = ({ item }: { item: Job }) => {
    const style = statusStyles[item.status] || { container: 'bg-gray-100', text: 'text-gray-800' };
    return (
        <TouchableOpacity className="bg-white p-4 rounded-lg shadow-sm mb-3 flex-row items-center">
            <View className="flex-1 pr-4">
                <Text className="text-base font-semibold text-gray-800" numberOfLines={1}>{item.title}</Text>
                <View className="flex-row items-center mt-1.5">
                    <MaterialIcons name="location-on" size={14} color="#6B7280" />
                    <Text className="text-sm text-gray-600 ml-1 flex-shrink" numberOfLines={1}>{item.location}</Text>
                </View>
            </View>
            <View className={`px-3 py-1.5 rounded-full ${style.container}`}>
                <Text className={`text-xs font-medium ${style.text}`}>{item.status}</Text>
            </View>
        </TouchableOpacity>
    );
  }

  return (
    <View>
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-bold text-gray-800">Recent Jobs</Text>
        <TouchableOpacity>
            <Text className="text-sm font-medium text-primary-medium-blue">View All</Text>
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
