import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { View } from "@/components/ui/view";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function JobFormHeader() {
  const insets = useSafeAreaInsets();
  const ctx = useJobFormContext();
  return (
    <View style={{ paddingTop: insets.top }}>
      <View className="flex gap-4 flex-row p-4 items-center justify-between">
        <Button onPress={ctx.navigateBack} variant={"ghost"}>
          <Icon name="ChevronLeft" className="size-20" size={20} />
        </Button>
        <View>
          <Text className="text-lg text-foreground font-medium">
            Create New Job
          </Text>
        </View>
        <View>
          <Button variant={"destructive"} size="sm">
            <Text className="text-foreground">Cancel</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
