// apps/expo-app/src/components/forms/job/job-select-project-list.tsx
import { Text, View, TouchableOpacity } from "react-native";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { use } from "react";

type ProjectListItemProps = {
  item: RouterOutputs["community"]["projectsList"][number];
  // isSelected: boolean;
  // onPress: () => void;
  // isCustom?: boolean;
};

function ProjectListItem({
  item,
}: // isSelected,
// onPress,
// isCustom = false,
ProjectListItemProps) {
  const {
    formData: { projectId },
    selectProject,
  } = useJobFormContext();
  const isSelected = projectId === item.id;
  const isCustom = item.id === -1;
  const onPress = () => {
    // Logic to select the project
    console.log("Selected Project ID:", item.id);
    // Example: setProjectId(item.id);
  };
  return (
    <TouchableOpacity
      onPress={onPress}
      className={cn(
        "group relative flex-row items-center gap-4 bg-card p-4 rounded-3xl border-2 transition-all",
        isSelected ? "border-primary/50" : "border-transparent"
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
          // name={item.icon as any}
          className={cn("text-muted-foreground", isCustom && "text-primary")}
          size={isCustom ? 28 : 24}
        />
      </View>
      <View className="flex-1 flex-col justify-center">
        <Text
          className={cn(
            "text-base font-medium text-foreground",
            isCustom && "text-lg font-bold"
          )}
        >
          {item.title}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {item.builderName}
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

export function JobSelectProjectList() {
  const { projectList, formData } = useJobFormContext();
  return (
    <View className="flex flex-col px-4 space-y-3">
      <ProjectListItem
        item={{ id: -1, title: "Custom" } as any}
        // item={customProject}
        // isSelected={selectedProjectId === customProject.id}
        // onPress={() => onSelectProject(customProject.id)}
        isCustom
      />
      <View className="h-4" />
      <Text className="px-4 text-xs font-bold text-muted-foreground/50 uppercase tracking-wider mb-1">
        Recent Projects
      </Text>

      {projectList?.map((project) => (
        <ProjectListItem
          key={project.id}
          item={project}
          // isSelected={selectedProjectId === project.id}
          // onPress={() => onSelectProject(project.id)}
        />
      ))}
    </View>
  );
}
