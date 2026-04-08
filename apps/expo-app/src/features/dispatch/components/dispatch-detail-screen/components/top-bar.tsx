import { Icon } from "@/components/ui/icon";
import { Pressable, Text, View } from "react-native";
import { useDispatchDetailScreen } from "./screen-context";

export function DispatchDetailTopBar() {
  const vm = useDispatchDetailScreen();

  return (
    <View className="border-b border-border bg-card px-4 pb-3">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={vm.onBack}
          className="h-10 w-10 items-center justify-center active:opacity-80"
        >
          <Icon name="ArrowLeft" className="text-foreground" size={20} />
        </Pressable>
        <Text className="flex-1 px-2 text-lg font-bold tracking-tight text-foreground">
          {vm.titleText}
        </Text>
        <Pressable className="h-10 w-10 items-center justify-center rounded-lg active:opacity-80">
          <Icon name="MoreHoriz" className="text-foreground" size={20} />
        </Pressable>
      </View>
    </View>
  );
}
