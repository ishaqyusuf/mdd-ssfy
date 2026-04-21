import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { LegendList } from "@legendapp/list";
import { Text, TouchableOpacity, View } from "react-native";

// 1. Make ProjectListItem a "dumb" component that only receives props.
type ProjectItem = RouterOutputs["community"]["projectsList"][number];
type ProjectListItemProps = {
  item: ProjectItem;
};

function ProjectListItem({ item }: ProjectListItemProps) {
  const isCustom = item.id === -1;
  const {
    selectProject,
    formData: { projectId: selectedProjectId },
    setTab,
  } = useJobFormContext();
  const isSelected = selectedProjectId === item.id;
  return (
    <TouchableOpacity
      onPress={(e) =>
        selectProject(item, () => {
          setTimeout(() => {
            setTab(isCustom ? "main" : "unit");
          }, 500);
        })
      } // Use the passed-in onPress handler
      className={cn(
        "group relative flex-row items-center gap-4 bg-card p-4 rounded-3xl border-2 transition-all my-1",
        isSelected
          ? "bg-primary/30 border-primary"
          : "border-transparent bg-card",
      )}
    >
      <View
        className={cn(
          "flex items-center justify-center rounded-full bg-muted shrink-0",
          isCustom ? "size-14" : "size-12",
        )}
      >
        <Icon
          name={"Zap"}
          className={cn("text-muted-foreground", isCustom && "text-foreground")}
          size={isCustom ? 28 : 24}
        />
      </View>
      <View className="flex-1 flex-col justify-center">
        <Text
          className={cn(
            "text-base font-medium ",
            isCustom && "text-lg font-bold",
            isSelected ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {item.title}
        </Text>
        <Text
          className={cn(
            "text-sm",
            isSelected ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {item.builder?.name}
        </Text>
      </View>
      <View
        className={cn(
          "shrink-0 size-6 rounded-full border-2 flex items-center justify-center transition-colors",
          isSelected ? "border-primary bg-primary" : "border-border",
        )}
      >
        <Icon
          name="Check"
          className={cn(
            "text-primary-foreground",
            isSelected ? "opacity-100" : "opacity-0",
          )}
          size={16}
        />
      </View>
    </TouchableOpacity>
  );
}

// 2. Move the state management and logic to the parent component.
export function JobSelectProjectList({ items = [] }: { items?: ProjectItem[] }) {
  const { state } = useJobFormContext();

  const customProjectItem: ProjectItem = {
    id: -1,
    title: "Custom",
    builder: {
      name: "Custom Project",
    },
  };

  return (
    <View className="flex flex-1 flex-col px-4 space-y-3">
      {state?.allowCustomJobs ? <ProjectListItem item={customProjectItem} /> : null}

      <LegendList
        data={items}
        ListHeaderComponent={
          <View className="mt-4">
            <Text className="px-4 text-xs font-bold text-foreground uppercase tracking-wider mb-1">
              Recent Projects
            </Text>
          </View>
        }
        ListFooterComponent={<View className="pb-32" />}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ProjectListItem item={item} />}
      />
    </View>
  );
}
