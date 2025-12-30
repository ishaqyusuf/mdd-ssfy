// apps/expo-app/src/components/forms/job/job-select-project-header.tsx
import { Text } from "@/components/ui/text";

import { View } from "@/components/ui/view";
import { Icon } from "@/components/ui/icon";
import { TouchableOpacity } from "react-native";

export function JobSelectProjectHeader({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center justify-between px-4 pt-6 pb-4">
      <TouchableOpacity
        onPress={onBack}
        className="flex size-10 items-center justify-center rounded-full hover:bg-muted/50 active:bg-muted/80"
      >
        <Icon name="ArrowLeft" className="text-foreground" size={24} />
      </TouchableOpacity>
      <Text className="text-lg font-bold text-foreground">New Job</Text>
      <View className="size-10" />
    </View>
  );
}
