// apps/expo-app/src/components/forms/job/job-form-footer.tsx
import { View, Text, Pressable } from "react-native";

import { Icon } from "@/components/ui/icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { cn } from "@/lib/utils";
import { BlurView } from "@/components/blur-view";
import { formatMoney } from "@gnd/utils";

export function JobFormFooter() {
  const { bottom } = useSafeAreaInsets();
  const ctx = useJobFormContext();
  return (
    <View className="absolute bottom-0 left-0 right-0">
      <BlurView intensity={90} className="w-full pt-4">
        <View
          className="p-4 border-t border-border"
          style={{ paddingBottom: bottom || 16 }}
        >
          <View className="flex-col w-full px-5 py-1 gap-4 max-w-lg mx-auto">
            <View className="flex-row items-end justify-between   w-full px-4">
              <View className="flex-col">
                <Text className="text-base font-medium text-muted-foreground">
                  Total Estimate
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {/* Includes 4 tasks */}
                  --
                </Text>
              </View>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-3xl font-bold text-primary tracking-tight">
                  ${formatMoney(ctx.total)}
                </Text>
              </View>
            </View>
            <Pressable
              disabled={ctx.isSaving}
              onPress={(e) => {
                ctx.handleSubmit();
              }}
              className={cn(
                "flex w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary h-14"
              )}
            >
              <Text className="text-primary-foreground text-lg font-bold">
                {ctx?.admin ? "Assign" : "Submit Job"}
              </Text>
              <Icon name="ArrowRight" className="text-primary-foreground" />
            </Pressable>
          </View>
        </View>
      </BlurView>
    </View>
  );
}
