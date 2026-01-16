// apps/expo-app/src/components/forms/job/job-form-footer.tsx
import { View, Text, Pressable } from "react-native";

import { Icon } from "@/components/ui/icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";
import { BlurView } from "@/components/blur-view";
import { useJobContext } from "@/hooks/use-job";
import { _push } from "./static-router";
import { Debug } from "./debug";

export function JobFooterContractor() {
  const { bottom } = useSafeAreaInsets();
  const ctx = useJobContext();
  if (ctx.adminMode) return null;
  const isAssigned = ctx.job?.status === "Assigned";
  if (!["Submitted", "Assigned"].includes(ctx.job?.status)) return null;
  return (
    <View className="absolute bottom-0 left-0 right-0">
      <BlurView intensity={90} className="w-full">
        <View
          className="p-4 border-t border-border"
          style={{ paddingBottom: bottom || 16 }}
        >
          <View className="flex-col w-full px-5 py-1 gap-4 max-w-lg mx-auto">
            {isAssigned ? (
              <>
                <Pressable
                  onPress={(e) => {
                    _push(`submit/${ctx?.job?.controlId!}`);
                  }}
                  className={cn(
                    "flex w-full flex-row items-center justify-center gap-2 rounded-xl bg-success h-14"
                  )}
                >
                  <Text className="text-success-foreground text-lg font-bold">
                    Submit
                  </Text>
                  {/* <Icon name="X" className="text-destructive-foreground" /> */}
                </Pressable>
              </>
            ) : (
              <Debug>
                <Pressable
                  //   disabled={ctx.isSaving}
                  onPress={(e) => {
                    // ctx.handleSubmit();
                  }}
                  className={cn(
                    "flex w-full flex-row items-center justify-center gap-2 rounded-xl bg-destructive h-14"
                  )}
                >
                  <Text className="text-destructive-foreground text-lg font-bold">
                    Cancel Submission
                  </Text>
                  <Icon name="X" className="text-destructive-foreground" />
                </Pressable>
              </Debug>
            )}
          </View>
        </View>
      </BlurView>
    </View>
  );
}
