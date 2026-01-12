// apps/expo-app/src/components/forms/job/job-select-project-search.tsx
import { TextInput, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useColors } from "@/hooks/use-color";

interface Props {
  placeholder: string;
  value?;
  onChangeText?;
}
export function SearchInput(props: Props) {
  const colors = useColors();
  return (
    <View className="px-5 py-2">
      <View className="flex-row h-14 w-full items-center rounded-full bg-card border border-foreground px-5 gap-3 shadow-sm">
        <Icon name="Search" className="text-muted-foreground" size={24} />
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          className="flex-1 bg-transparent text-base text-foreground h-full"
          placeholder={props.placeholder}
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
    </View>
  );
}
