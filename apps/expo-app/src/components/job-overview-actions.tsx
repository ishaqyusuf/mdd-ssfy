import { useJobContext } from "@/hooks/use-job";
import { Pressable, Text, View } from "react-native";
import { Icon } from "./ui/icon";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "./static-trpc";
import { Toast } from "./ui/toast";
import { editJob } from "@/lib/job";
import { useRouter } from "expo-router";
import { BlurView } from "@/components/blur-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function JobOverviewActions() {
  const { bottom } = useSafeAreaInsets();
  const ctx = useJobContext();
  const job = useComposer();
  const hasAnyAction = Boolean(
    (job.isAdmin && Boolean(ctx?.job?.hasConfigRequested)) ||
      (job.isAdmin && job.isAssigned) ||
      (job.isAdmin && (job.isSubmitted || job.isApproved || job.isRejected)),
  );
  if (!hasAnyAction) return null;

  return (
    <View className="absolute bottom-0 left-0 right-0">
      <BlurView intensity={90} className="w-full">
        <View
          className="p-4 border-t border-border"
          style={{ paddingBottom: bottom || 16 }}
        >
          <View className="flex-col w-full px-5 py-1 gap-3 max-w-lg mx-auto">
            <ConfigureJobAction />
            <ReAssginJobAction />
            <DeleteJobAction />
            <ReviewJobAction />
          </View>
        </View>
      </BlurView>
    </View>
  );
}
function ConfigureJobAction() {
  const ctx = useJobContext();
  const router = useRouter();
  const job = useComposer();
  const show = [job.isAdmin, Boolean(ctx?.job?.hasConfigRequested)].every(
    Boolean,
  );
  if (!show) return null;

  const modelId = Number(ctx?.job?.home?.communityTemplateId || 0);
  const builderTaskId = Number(ctx?.job?.builderTaskId || 0);
  const contractorId = Number(ctx?.job?.user?.id || 0);
  const jobId = Number(ctx?.job?.id || 0);

  if (!modelId || !builderTaskId || !jobId) return null;

  return (
    <Pressable
      onPress={() => {
        router.push({
          pathname: "/(job)/install-cost/[modelId]/form",
          params: {
            modelId: String(modelId),
            builderTaskId: String(builderTaskId),
            requestBuilderTaskId: String(builderTaskId),
            ...(jobId ? { jobId: String(jobId) } : {}),
            ...(contractorId ? { contractorId: String(contractorId) } : {}),
          },
        } as any);
      }}
      className="w-full py-4 px-4 bg-primary rounded-xl flex-row items-center justify-center gap-2 border border-border"
    >
      <Icon name="Wrench" className="text-primary-foreground size-16" />
      <Text className="text-primary-foreground font-semibold">Configure</Text>
    </Pressable>
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
        className="w-full py-4 px-4 bg-destructive rounded-xl flex-row items-center justify-center gap-2"
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
    <View className="bg-card rounded-2xl p-6 border border-border shadow-sm">
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
