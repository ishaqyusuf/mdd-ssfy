import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { View } from "@/components/ui/view";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { Platform, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function JobFormHeader() {
  const insets = useSafeAreaInsets();
  const ctx = useJobFormContext();
  return (
    <View style={{ paddingTop: Platform.OS == "android" ? insets.top : 0 }}>
      <View className="flex gap-4 flex-row p-4 items-center justify-between">
        <Button onPress={ctx.navigateBack} variant={"ghost"}>
          <Icon name="ChevronLeft" className="size-20" size={24} />
        </Button>

        <Text className="text-lg font-bold leading-tight tracking-wide text-foreground text-center flex-1">
          Add Job
        </Text>

        <View>
          {/* <Button variant={"destructive"} size="sm">
            <Text className="text-foreground">Cancel</Text>
          </Button> */}
          <Pressable className="flex h-10 items-center justify-center px-2 rounded-full">
            <Text className="text-destructive  text-sm font-bold tracking-wide">
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
