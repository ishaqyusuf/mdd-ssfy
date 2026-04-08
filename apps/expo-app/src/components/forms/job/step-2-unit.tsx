import { View, Text, TouchableOpacity } from "react-native";
import { LegendList } from "@legendapp/list";
import { useColorScheme } from "@/hooks/use-color";
import { useJobFormContext } from "@/hooks/use-job-form";
import { useMemo } from "react";

export function UnitSelect({ onSelect }) {
  const { colorScheme } = useColorScheme();
  const ctx = useJobFormContext();
  const jobsList = ctx.jobsListData?.homeList;
  const jobsLists = useMemo(() => {
    if (!jobsList) return [];
    return jobsList;
  }, [jobsList]);
  const renderItem = ({ item }: { item }) => (
    <TouchableOpacity
      className="p-4 border-b border-gray-200 dark:border-gray-700"
      onPress={() => {
        // console.log(item);
        // setUnit(item)
        ctx.selectUnit(item, onSelect);
      }}
    >
      <Text className="text-lg text-gray-800 dark:text-gray-200">
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="bg-background">
      {!jobsLists?.length ? (
        <></>
      ) : (
        <>
          <LegendList
            data={jobsLists}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
          />
        </>
      )}
    </View>
  );
}
