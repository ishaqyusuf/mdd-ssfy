// apps/expo-app/src/components/forms/job/job-form-footer.tsx
import { View, Text, Pressable } from "react-native";

import { Icon } from "@/components/ui/icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";
import { BlurView } from "@/components/blur-view";
import { useJobContext } from "@/hooks/use-job";
import { editJob } from "@/lib/job";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "./static-trpc";
import { Toast } from "./ui/toast";

export function JobFooterContractor() {
  const { bottom } = useSafeAreaInsets();
  const ctx = useJobContext();
  const status = ctx.job?.status || "";
  const isSubmittable = [
    "Assigned",
    "In Progress",
    "Config Requested",
    "Submitted",
  ].includes(status);
  const isSubmitDisabled = status === "Config Requested";
  const submitLabel = status === "Submitted" ? "Update Submission" : "Submit";
  const { mutate: deleteJob, isPending: isDeleting } = useMutation(
    _trpc.jobs.deleteJob.mutationOptions({
      onSuccess() {
        Toast.show("Job deleted", { type: "success" });
      },
      onError() {
        Toast.show("Unable to delete job", { type: "error" });
      },
    }),
  );
  if (ctx.adminMode) return null;
  if (!isSubmittable) return null;

  return (
    <View className="absolute bottom-0 left-0 right-0">
      <BlurView intensity={90} className="w-full">
        <View
          className="p-4 border-t border-border"
          style={{ paddingBottom: bottom || 16 }}
        >
          <View className="flex-col w-full px-5 py-1 gap-4 max-w-lg mx-auto">
            <View className="flex-row items-center gap-3">
              <Pressable
                disabled={isSubmitDisabled}
                onPress={() => {
                  if (isSubmitDisabled) return;
                  editJob(ctx?.job as any);
                }}
                className={cn(
                  "flex-1 flex-row items-center justify-center gap-2 rounded-xl h-14",
                  isSubmitDisabled ? "bg-muted" : "bg-success",
                )}
              >
                <Text
                  className={cn(
                    "text-lg font-bold",
                    isSubmitDisabled
                      ? "text-muted-foreground"
                      : "text-success-foreground",
                  )}
                >
                  {submitLabel}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!ctx.job?.id || isDeleting) return;
                  deleteJob({
                    id: ctx.job.id,
                  });
                }}
                className={cn(
                  "h-14 w-14 flex-row items-center justify-center rounded-xl border border-destructive/40 bg-destructive/10",
                )}
              >
                <Icon name="Trash" className="text-destructive" />
              </Pressable>
            </View>
          </View>
        </View>
      </BlurView>
    </View>
  );
}
