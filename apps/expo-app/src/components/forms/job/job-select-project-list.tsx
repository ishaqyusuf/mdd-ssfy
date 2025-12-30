// apps/expo-app/src/components/forms/job/job-select-project-list.tsx
import { Text } from "@/components/ui/text";

import { View } from "@/components/ui/view";

import { Icon } from "@/components/ui/icon";
import type { Project } from "./select-project-step";
import { TouchableOpacity } from "react-native";
import { cn } from "@/lib/utils";

type ProjectListItemProps = {
  item: Project;
  isSelected: boolean;
  onPress: () => void;
  isCustom?: boolean;
};

function ProjectListItem({
  item,
  isSelected,
  onPress,
  isCustom = false,
}: ProjectListItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={cn(
        "group relative flex-row items-center gap-4 bg-card p-4 rounded-3xl border-2 transition-all active:scale-[0.99]",
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
          // name={item.icon as any}
          name="Check"
          className={cn("text-muted-foreground", isCustom && "text-primary")}
          // size={isCustom ? 28 : 24}
        />
      </View>

      <View className="flex-1 flex-col justify-center">
        <Text
          className={cn(
            "text-base font-medium text-foreground",
            isCustom && "text-lg font-bold"
          )}
        >
          {item.name}BBBB
        </Text>
        <Text className="text-sm text-muted-foreground">{item.location}</Text>
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
        />
      </View>
    </TouchableOpacity>
  );
}

type ProjectListProps = {
  customProject: Project;
  recentProjects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
};

export function JobSelectProjectList({
  customProject,
  recentProjects,
  selectedProjectId,
  onSelectProject,
}: ProjectListProps) {
  return (
    <View className="flex-col gap-2 mt-4 px-4">
      <ProjectListItem
        item={customProject}
        isSelected={selectedProjectId === customProject.id}
        onPress={() => onSelectProject(customProject.id)}
        isCustom
      />
      <View className="h-4" />
      <Text className="px-4 text-xs font-bold text-muted-foreground/50 uppercase tracking-wider mb-1">
        Recent Projects
      </Text>
      {recentProjects.map((project) => (
        <ProjectListItem
          key={project.id}
          item={project}
          isSelected={selectedProjectId === project.id}
          onPress={() => onSelectProject(project.id)}
        />
      ))}
    </View>
  );
}
