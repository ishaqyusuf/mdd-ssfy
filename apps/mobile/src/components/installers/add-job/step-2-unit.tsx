import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useAddJobStore } from '../../../stores/use-add-job-store';
import { UNITS, Unit } from './dummy-data';
import { useMemo } from 'react';
import { MaterialIcons } from '@expo/vector-icons';

export function Step2Unit() {
  const { project } = useAddJobStore();
  const { setUnit, prevStep } = useAddJobStore((s) => s.actions);

  const projectUnits = useMemo(
    () => UNITS.filter((u) => u.projectId === project?.id),
    [project]
  );

  const renderItem = ({ item }: { item: Unit }) => (
    <TouchableOpacity
      className="p-4 border-b border-gray-200"
      onPress={() => setUnit(item)}
    >
      <Text className="text-lg">{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View>
      <View className="p-4 flex-row items-center bg-gray-50 border-b border-gray-200">
        <TouchableOpacity onPress={prevStep} className="p-2">
            <MaterialIcons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-xl font-bold ml-4">Select Unit</Text>
      </View>
      <FlatList
        data={projectUnits}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}
