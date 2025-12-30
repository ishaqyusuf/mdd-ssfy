import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { View } from "@/components/ui/view";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function JobFormHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top }}>
      <View className="flex gap-4 flex-row p-4 items-center justify-between">
        <Button variant={"ghost"}>
          <Icon name="ChevronLeft" className="size-20" size={20} />
        </Button>
        <View>
          <Text className="text-lg text-foreground font-medium">
            Create New Job
          </Text>
        </View>
        <View>
          <Button variant={"ghost"}>
            <Text className="text-destructive">Cancel</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
