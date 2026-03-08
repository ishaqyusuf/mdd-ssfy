import { useJobContext } from "@/hooks/use-job";
import { Pressable, Text, View } from "react-native";
import { Icon } from "./ui/icon";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "./static-trpc";
import { Toast } from "./ui/toast";
import { editJob } from "@/lib/job";
import { useRouter } from "expo-router";

export function JobOverviewActions() {
  const ctx = useJobContext();

  // if (!ctx.adminMode) return null;

  return (
    <>
      <ReAssginJobAction />
      <DeleteJobAction />
      <ReviewJobAction />
    </>
  );
}
function ReAssginJobAction() {
  const ctx = useJobContext();
  const composer = useComposer();
  const show = composer.isAdmin && composer.isAssigned;
  if (!show) return null;
  return (
    <Pressable
      onPress={(e) => {
        editJob(ctx?.job as any);
      }}
      className="w-full py-4 px-4 bg-secondary-foreground rounded-xl flex-row items-center justify-center gap-2 border border-border"
    >
      <Icon name="UserPlus" className="text-secondary size-16" />
      <Text className="text-secondary font-semibold">Re-Assign Job</Text>
    </Pressable>
  );
}
function DeleteJobAction() {
  const ctx = useJobContext();
  const job = useComposer();
  const { mutate: restoreJob } = useMutation(
    _trpc.jobs.restoreJob.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {},
      onError(error, variables, onMutateResult, context) {},
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    }),
  );
  const { mutate: deleteJob } = useMutation(
    _trpc.jobs.deleteJob.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        Toast.show(`Deleted`, {
          action: {
            label: "Restore",
            onPress() {
              restoreJob({
                jobId: ctx?.job?.id!,
              });
            },
          },
        });
      },
      onError(error, variables, onMutateResult, context) {},
      meta: {},
    }),
  );
  const show = [job.isAdmin && job.isAssigned].every(Boolean);
  if (!show) return null;
  return (
    <>
      <Pressable
        onPress={(e) => {
          deleteJob({
            id: job.id!,
          });
        }}
        className="flex-1 py-4 px-4 bg-destructive rounded-xl flex-row items-center justify-center gap-2"
      >
        <Icon name="Trash" className="text-destructive-foreground size-16" />
        <Text className="text-destructive-foreground font-semibold">
          Delete
        </Text>
      </Pressable>
    </>
  );
}
function ReviewJobAction() {
  const job = useComposer();
  const router = useRouter();
  const showReview = [job.isAdmin, job.isSubmitted].every(Boolean);
  const showUpdateReview = [
    job.isAdmin,
    job.isApproved || job.isRejected,
  ].every(Boolean);
  if (!showReview && !showUpdateReview) return null;
  return (
    <View className="bg-card rounded-2xl p-6 border border-border mb-6 shadow-sm">
      <View className="flex-row items-center gap-3 mb-6">
        <View className="p-2 rounded-lg bg-accent/10">
          <Icon name="ShieldCheck" className="text-accent-foreground size-20" />
        </View>
        <Text className="text-lg font-bold text-foreground">Admin Review</Text>
      </View>
      <Pressable
        onPress={() => router.push(`/job/${job.id}/review` as any)}
        className="w-full py-4 px-4 bg-accent rounded-xl flex-row items-center justify-center gap-2"
      >
        <Icon name="ShieldCheck" className="text-accent-foreground size-16" />
        <Text className="text-accent-foreground font-semibold">
          Open Review
        </Text>
      </Pressable>
    </View>
  );
}
function useComposer() {
  const ctx = useJobContext();
  const status = ctx?.job?.status?.toLocaleLowerCase();
  return {
    isAdmin: ctx?.adminMode,
    status: ctx?.job?.status,
    id: ctx?.job?.id,
    isAssigned: status === "assigned",
    isApproved: status === "approved",
    isRejected: status === "rejected",
    isSubmitted: status === "submitted",
    recentActivity: {
      // note: ctx?.job?.notes?.[0],
      date: "",
      author: "",
    },
  };
}
