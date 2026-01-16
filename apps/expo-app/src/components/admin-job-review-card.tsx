import { useJobContext } from "@/hooks/use-job";
import { Pressable, Text, TextInput, View } from "react-native";
import { Icon } from "./ui/icon";
import { useMutation } from "@tanstack/react-query";
import { _qc, _trpc } from "./static-trpc";
import { Toast } from "./ui/toast";
import { Controller, useForm } from "react-hook-form";

export function AdminJobReviewCard() {
  const ctx = useJobContext();

  const form = useForm({
    defaultValues: {
      note: "",
    },
  });
  const { mutate: restoreJob, isPending: isRestoring } = useMutation(
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
    })
  );
  const { mutate: deleteJob, isPending: isDeletingJob } = useMutation(
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
    })
  );
  const { mutate: _reviewAction, isPending: isReviewing } = useMutation(
    _trpc.jobs.jobReview.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        _qc.invalidateQueries({
          queryKey: _trpc.jobs.getJobs.queryKey(),
        });
        // _qc.invalidateQueries({
        //   queryKey: _trpc.jobs..queryKey(),
        // });
      },
      onError(error, variables, onMutateResult, context) {},
      meta: {
        toastTitle: {
          show: true,
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    })
  );
  const reviewAction = (action: "approve" | "reject") => {
    _reviewAction({
      note: form.getValues("note"),
      jobId: ctx?.job?.id!,
      action,
    });
  };
  if (!ctx.adminMode) return null;

  if (ctx.job?.status === "Assigned")
    return (
      <>
        <Pressable
          onPress={(e) => {}}
          className="w-full py-4 px-4 bg-secondary-foreground rounded-xl flex-row items-center justify-center gap-2 border border-border"
        >
          <Icon name="UserPlus" className="text-secondary size-16" />
          <Text className="text-secondary font-semibold">Re-Assign Job</Text>
        </Pressable>
        <Pressable
          onPress={(e) => {
            deleteJob({
              id: ctx?.job?.id!,
            });
          }}
          className="flex-1 py-4 px-4 bg-destructive rounded-xl flex-row items-center justify-center gap-2"
        >
          <Icon name="Delete" className="text-destructive-foreground size-16" />
          <Text className="text-destructive-foreground font-semibold">
            Delete
          </Text>
        </Pressable>
      </>
    );
  if (ctx?.job?.status?.toLowerCase() === "approved") return null;
  if (ctx?.job?.status?.toLowerCase() === "Rejected") return null;
  return (
    <View className="bg-card rounded-2xl p-6 border border-border mb-6 shadow-sm">
      <View className="flex-row items-center gap-3 mb-6">
        <View className="p-2 rounded-lg bg-accent/10">
          <Icon name="ShieldCheck" className="text-accent-foreground size-20" />
        </View>
        <Text className="text-lg font-bold text-foreground">Admin Review</Text>
      </View>

      <View className="mb-6">
        <Text className="text-xs font-semibold text-muted-foreground uppercase mb-3">
          Internal Notes
        </Text>

        <Controller
          control={form.control}
          name="note"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              className="w-full bg-background border border-border rounded-xl text-sm p-4 text-foreground min-h-25"
              placeholder="Enter notes regarding approval or rejection..."
              placeholderTextColor="hsl(var(--muted-foreground))"
              multiline
              textAlignVertical="top"
            />
          )}
        />
      </View>

      <View className="gap-3">
        <View className="flex-row gap-3">
          <Pressable
            disabled={isReviewing}
            onPress={(e) => reviewAction("reject")}
            className="flex-1 py-4 px-4 bg-destructive rounded-xl flex-row items-center justify-center gap-2"
          >
            <Icon name="X" className="text-destructive-foreground size-16" />
            <Text className="text-destructive-foreground font-semibold">
              Reject
            </Text>
          </Pressable>

          <Pressable
            disabled={isReviewing}
            onPress={(e) => reviewAction("approve")}
            className="flex-1 py-4 px-4 bg-accent rounded-xl flex-row items-center justify-center gap-2"
          >
            <Icon name="Check" className="text-accent-foreground size-16" />
            <Text className="text-accent-foreground font-semibold">
              Approve
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
