import {
  FilterProvider,
  useCreateFilterContext,
  useFilterContext,
} from "@/context/filter-context";
import { cn } from "@/lib/utils";
import { Pressable, ScrollView, Text, View } from "react-native";

function Root({ children, className = "", name }) {
  return (
    <View className={cn("mb-6", className)}>
      <FilterProvider value={useCreateFilterContext({ name })}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        >
          {children}
        </ScrollView>
      </FilterProvider>
    </View>
  );
}
function Pill({ value, label }) {
  const { filterValue, filter } = useFilterContext();
  const isActive = filterValue === value || (!value && !filterValue);
  return (
    <Pressable
      onPress={(e) => {
        filter(value);
      }}
      className={`px-5 py-2 rounded-full border ${
        isActive ? "bg-primary border-primary" : "bg-card border-border"
      }`}
    >
      <Text
        className={`text-sm font-semibold ${
          isActive ? "text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export const HorizontalFilterPills = Object.assign(Root, { Pill });
