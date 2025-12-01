import { View, Text, TouchableOpacity } from "react-native";
import { useAddJobStore } from "../../../stores/use-add-job-store";
import { Unit } from "./dummy-data";
import { MaterialIcons } from "@expo/vector-icons";
import { LegendList } from "@legendapp/list";
import { useColorScheme } from "nativewind";
import { useJobFormContext } from "@/hooks/use-job-form";

export function Step2Unit({}) {
  // const { project } = useAddJobStore();
  const { setUnit, prevStep } = useAddJobStore((s) => s.actions);
  const { colorScheme } = useColorScheme();
  const ctx = useJobFormContext();
  const jobsList = ctx.jobsListData?.homeList;

  const renderItem = ({ item }: { item: Unit }) => (
    <TouchableOpacity
      className="p-4 border-b border-gray-200 dark:border-gray-700"
      onPress={() => setUnit(item)}
    >
      <Text className="text-lg text-gray-800 dark:text-gray-200">
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View>
      <View className="p-4 flex-row items-center bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={prevStep} className="p-2">
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={colorScheme === "dark" ? "#F9FAFB" : "black"}
          />
        </TouchableOpacity>
        <Text className="text-xl font-bold ml-4 text-gray-900 dark:text-gray-100">
          Select Unit
        </Text>
      </View>
      <LegendList
        data={jobsList || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}
