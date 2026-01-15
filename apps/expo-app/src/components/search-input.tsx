// apps/expo-app/src/components/forms/job/job-select-project-search.tsx
import { TextInput, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useColors } from "@/hooks/use-color";
import { cn } from "@/lib/utils";

interface Props {
  placeholder: string;
  className?: string;
  value?;
  onChangeText?;
  size?: "sm" | "default";
}
export function SearchInput(props: Props) {
  const size = props.size || "default";
  const isDefault = size == "default";
  const colors = useColors();
  return (
    <View className={cn("px-5 py-2", props?.className)}>
      <View
        className={cn(
          "flex-row w-full items-center rounded-full bg-card border  gap-3 shadow-sm border-border",
          isDefault ? "h-14 px-5" : "h-12 px-4"
        )}
      >
        <Icon
          name="Search"
          className="text-muted-foreground"
          size={isDefault ? 24 : 18}
        />
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          className="flex-1 bg-transparent text-base text-foreground h-full"
          placeholder={props.placeholder}
          // placeholderTextColor={colors.mutedForeground}
          placeholderTextColor="hsl(var(--muted-foreground))"
        />
      </View>
    </View>
  );
}
