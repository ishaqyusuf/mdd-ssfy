import { View, Text, TouchableOpacity } from "react-native";
import { LegendList } from "@legendapp/list";
import { useJobFormContext } from "@/hooks/use-job-form";

export function ProjectSelect({ onSelect }) {
  const ctx = useJobFormContext();
  const projects = ctx.projectList;
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="p-4 border-b border-gray-200 dark:border-gray-700"
      onPress={() => ctx.selectProject(item, onSelect)}
    >
      <Text className="text-lg">{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View className="bg-background">
      <Text className="text-xl font-bold p-4 text-gray-900 dark:text-gray-100">
        Select Project
      </Text>
      <LegendList
        data={[
          {
            id: null,
            title: "None",
          },
          ...(projects || []),
        ]}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id || "-1")}
      />
    </View>
  );
}
