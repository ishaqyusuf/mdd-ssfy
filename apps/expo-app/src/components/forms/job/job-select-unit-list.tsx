// apps/expo-app/src/components/forms/job/job-select-project-list.tsx
import { Text, View, TouchableOpacity } from "react-native";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { LegendList } from "@legendapp/list";
import { useMemo } from "react";

// 1. Make ProjectListItem a "dumb" component that only receives props.
type ProjectListItemProps = {
  item;
};

function UnitListItem({ item }: ProjectListItemProps) {
  const isCustom = item.id === -1;
  const {
    selectUnit,
    formData: { homeId },
  } = useJobFormContext();
  const isSelected = homeId === item.id;
  return (
    <TouchableOpacity
      onPress={(e) => selectUnit(item, () => {})} // Use the passed-in onPress handler
      className={cn(
        "group relative flex-row items-center gap-4 bg-card p-4 rounded-3xl border-2 transition-all my-1",
        isSelected ? "bg-primary" : "border-transparent bg-accent"
      )}
    >
      <View
        className={cn(
          "flex items-center justify-center rounded-full bg-muted shrink-0",
          isCustom ? "size-14" : "size-12"
        )}
      >
        <Icon
          name={"Zap"}
          className={cn("text-muted-foreground", isCustom && "text-primary")}
          size={isCustom ? 28 : 24}
        />
      </View>
      <View className="flex-1 flex-col justify-center">
        <Text
          className={cn(
            "text-base font-medium ",
            isCustom && "text-lg font-bold",
            isSelected ? "text-primary-foreground" : "text-foreground"
          )}
        >
          {item.name}
        </Text>
        <Text
          className={cn(
            "text-sm",
            isSelected ? "text-primary-foreground/75" : "text-muted-foreground"
          )}
        >
          {item.builder?.name}
        </Text>
      </View>
      <View
        className={cn(
          "shrink-0 size-6 rounded-full border-2 flex items-center justify-center transition-colors",
          isSelected ? "border-primary bg-primary" : "border-border"
        )}
      >
        <Icon
          name="Check"
          className={cn(
            "text-primary-foreground",
            isSelected ? "opacity-100" : "opacity-0"
          )}
          size={16}
        />
      </View>
    </TouchableOpacity>
  );
}

// 2. Move the state management and logic to the parent component.
export function JobSelectUnitList() {
  const { jobsListData } = useJobFormContext();

  const customProjectItem = {
    id: -1,
    name: "Custom",
  } as any;
  const jobsList = jobsListData?.homeList;
  const jobsLists = useMemo(() => {
    if (!jobsList) return [];
    return jobsList;
  }, [jobsList]);
  return (
    <View className="flex flex-1 flex-col px-4 space-y-3">
      <UnitListItem item={customProjectItem} />

      <LegendList
        data={jobsLists}
        ListHeaderComponent={
          <View className="mt-4">
            <Text className="px-4 text-xs font-bold text-foreground uppercase tracking-wider mb-1">
              Available Units
            </Text>
          </View>
        }
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <UnitListItem item={item} />}
      />
    </View>
  );
}
