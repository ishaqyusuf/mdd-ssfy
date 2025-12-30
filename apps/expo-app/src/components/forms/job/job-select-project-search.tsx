// apps/expo-app/src/components/forms/job/job-select-project-search.tsx
import { TextInput, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useColors } from "@/hooks/use-color";

export function JobSelectProjectSearch() {
  const colors = useColors();
  return (
    <View className="px-5 py-2">
      <View className="flex-row h-14 w-full items-center rounded-full bg-card border border-border px-5 shadow-sm">
        <Icon name="Search" className="text-muted-foreground mr-3" size={24} />
        <TextInput
          className="flex-1 bg-transparent text-base text-foreground h-full"
          placeholder="Search projects"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
    </View>
  );
}
