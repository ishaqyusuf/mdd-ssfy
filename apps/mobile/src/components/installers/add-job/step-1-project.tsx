import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useAddJobStore } from '../../../stores/use-add-job-store';
import { PROJECTS, Project } from './dummy-data';

export function Step1Project() {
  const { setProject } = useAddJobStore((s) => s.actions);

  const renderItem = ({ item }: { item: Project }) => (
    <TouchableOpacity
      className="p-4 border-b border-gray-200"
      onPress={() => setProject(item)}
    >
      <Text className="text-lg">{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View>
      <Text className="text-xl font-bold p-4">Select Project</Text>
      <FlatList
        data={PROJECTS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}
