import React from "react";
import { View, TouchableOpacity, TextInput } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Text } from "@/components/ui/text";
import { useJobsStore } from "@/stores/use-jobs-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "@/hooks/use-color";

export function JobsHeader() {
  const navigation = useNavigation();
  const { colorScheme } = useColorScheme();
  const { searchQuery, setSearchQuery } = useJobsStore();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }} className="bg-background border-b">
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 rounded-full"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colorScheme === "dark" ? "#F9FAFB" : "#1F2937"}
          />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800 dark:text-gray-100 flex-1 text-center">
          All Jobs
        </Text>
        <TouchableOpacity className="p-2 rounded-full active:bg-gray-200 dark:active:bg-gray-700">
          <MaterialIcons
            name="filter-list"
            size={24}
            color={colorScheme === "dark" ? "#F9FAFB" : "#1F2937"}
          />
        </TouchableOpacity>
      </View>
      <View className="px-4 pb-3">
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
          <Ionicons
            name="search"
            size={20}
            color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
          />
          <TextInput
            className="flex-1 ml-2 text-gray-800 dark:text-gray-100"
            placeholder="Search jobs..."
            placeholderTextColor={
              colorScheme === "dark" ? "#9CA3AF" : "#6B7280"
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
    </View>
  );
}
