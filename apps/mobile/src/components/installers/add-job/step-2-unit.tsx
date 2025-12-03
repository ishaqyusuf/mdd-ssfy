import { View, Text, TouchableOpacity } from "react-native";
import { Unit } from "./dummy-data";
import { MaterialIcons } from "@expo/vector-icons";
import { LegendList } from "@legendapp/list";
import { useColorScheme } from "nativewind";
import { useJobFormContext } from "@/hooks/use-job-form";
import { useMemo } from "react";

export function Step2Unit({}) {
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
        ctx.selectUnit(item);
      }}
    >
      <Text className="text-lg text-gray-800 dark:text-gray-200">
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View>
      <View className="p-4 flex-row items-center bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity
          onPress={(e) => {
            ctx.setTab("project");
          }}
          className="p-2"
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={colorScheme === "dark" ? "#F9FAFB" : "black"}
          />
        </TouchableOpacity>
        <Text className="text-xl font-bold ml-4 text-gray-900 dark:text-gray-100">
          Select Unit | ({jobsLists?.length})
        </Text>
      </View>
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
