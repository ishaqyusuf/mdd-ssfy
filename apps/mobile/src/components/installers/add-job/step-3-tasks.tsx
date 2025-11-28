import { View, Text, TextInput, FlatList, TouchableOpacity, Button } from 'react-native';
import { useAddJobStore } from '../../../stores/use-add-job-store';
import { TASKS, Task } from './dummy-data';
import { MaterialIcons } from '@expo/vector-icons';

export function Step3Tasks() {
  const { tasks, project, unit } = useAddJobStore();
  const { setTaskQty, prevStep, reset } = useAddJobStore((s) => s.actions);

  const handleSubmit = () => {
    console.log('Submitting job:', {
      project,
      unit,
      tasks,
    });
    // Here you would typically make an API call
    reset(); // Reset and close the sheet
  };

  const renderItem = ({ item }: { item: Task }) => {
    const taskQty = tasks.find(t => t.taskId === item.id)?.qty ?? 0;
    return (
      <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
        <View>
          <Text className="text-lg">{item.name}</Text>
          <Text className="text-sm text-gray-500">
            Rate: ${item.ratePerUnit}/unit
          </Text>
        </View>
        <TextInput
          className="border border-gray-300 rounded-md w-20 h-10 text-center"
          keyboardType="numeric"
          placeholder="Qty"
          onChangeText={(text) => setTaskQty(item.id, Number(text))}
          value={taskQty > 0 ? String(taskQty) : ''}
        />
      </View>
    );
  };

  return (
    <View className="flex-1">
        <View className="p-4 flex-row items-center bg-gray-50 border-b border-gray-200">
            <TouchableOpacity onPress={prevStep} className="p-2">
                <MaterialIcons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text className="text-xl font-bold ml-4">Tasks Information</Text>
        </View>
      <FlatList
        data={TASKS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListFooterComponent={
            <View className="p-4">
                <Button title="Submit Job" onPress={handleSubmit} />
            </View>
        }
      />
    </View>
  );
}
