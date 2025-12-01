import { View, Text, TouchableOpacity } from "react-native";
import { useAddJobStore } from "../../../stores/use-add-job-store";
import { TASKS, Task } from "./dummy-data";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Input } from "@/components/ui/input-2"; // Import the new Input component
import { Button } from "@/components/ui/button";
import { LegendList } from "@legendapp/list";
import {
  KeyboardAwareScrollView,
  KeyboardGestureArea,
} from "react-native-keyboard-controller";
import { useJobFormContext } from "@/hooks/use-job-form";
export function Step3Tasks() {
  const { tasks, project, unit } = useAddJobStore();
  const ctx = useJobFormContext();
  const { setTaskQty, prevStep, reset } = useAddJobStore((s) => s.actions);
  const { colorScheme } = useColorScheme();

  const handleSubmit = () => {
    console.log("Submitting job:", {
      project,
      unit,
      tasks,
    });
    // Here you would typically make an API call
    reset(); // Reset and close the sheet
  };

  const renderItem = ({ item }: { item: Task }) => {
    const taskQty = tasks.find((t) => t.taskId === item.id)?.qty ?? 0;
    return (
      <View className="p-4 border-b border-gray-200 dark:border-gray-700 flex-row justify-between items-center">
        <View>
          <Text className="text-lg text-gray-800 dark:text-gray-200">
            {item.name}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Rate: ${item.ratePerUnit}/unit
          </Text>
        </View>
        {/* <Input className="w-20 h-10 text-center" /> */}
        <View className="w-20">
          <Input // Use the new Input component
            // className="w-20 h-10 text-center" // Keep specific sizing and alignment
            keyboardType="numeric"
            placeholder="Qty"
            placeholderTextColor={
              colorScheme === "dark" ? "#9CA3AF" : "#6B7280"
            }
            // onChangeText={(text) => setTaskQty(item.id, Number(text))}
            // value={taskQty > 0 ? String(taskQty) : ''}
          />
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <View className="p-4 flex-row items-center bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={prevStep} className="p-2">
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={colorScheme === "dark" ? "#F9FAFB" : "black"}
          />
        </TouchableOpacity>
        <Text className="text-xl font-bold ml-4 text-gray-900 dark:text-gray-100">
          Tasks Information
        </Text>
      </View>
      <LegendList
        data={TASKS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListFooterComponent={
          <View className="p-4 bg-white dark:bg-gray-900">
            <Button onPress={handleSubmit}>
              <Text>Submit Job</Text>
            </Button>
          </View>
        }
      />
    </View>
  );
}
