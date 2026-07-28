import { BlurView } from "@/components/blur-view";
import { Icon } from "@/components/ui/icon";
import { Pressable, Text, View } from "react-native";
import { useDispatchDetailScreen } from "./screen-context";

export function DispatchDetailFooterActions() {
  const vm = useDispatchDetailScreen();

  return (
    <BlurView intensity={90} className="border-t border-border">
      <View style={{ paddingBottom: Math.max(22, vm.insetsBottom + 14) }}>
        <View className="px-5 pt-3">
          <View className="flex-row gap-3">
            <Pressable
              onPress={vm.onIssue}
              disabled={vm.isIssuePending}
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-border disabled:opacity-50"
            >
              <Icon name="AlertCircle" className="text-foreground" size={18} />
              <Text className="font-bold text-foreground">Issue</Text>
            </Pressable>
            <Pressable
              onPress={vm.onFooterPrimaryAction}
              disabled={vm.footerPrimaryDisabled}
              className="h-12 flex-[2] flex-row items-center justify-center gap-2 rounded-xl bg-primary disabled:opacity-50"
            >
              <Icon name="CheckSquare" className="text-primary-foreground" size={18} />
              <Text className="font-bold text-primary-foreground">
                {vm.footerPrimaryLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </BlurView>
  );
}

