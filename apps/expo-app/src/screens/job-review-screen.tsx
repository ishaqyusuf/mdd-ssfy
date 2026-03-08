import { BackBtn } from "@/components/back-btn";
import { SafeArea } from "@/components/safe-area";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { _qc, _trpc } from "@/components/static-trpc";
import { Toast } from "@/components/ui/toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

type JobReviewScreenProps = {
  adminMode?: boolean;
  jobId?: number;
};

export function JobReviewScreen({ adminMode, jobId }: JobReviewScreenProps) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const id = Number(jobId);
  const canFetch = Number.isFinite(id) && id > 0;
  const { data: overview, isPending } = useQuery(
    _trpc.jobs.overview.queryOptions(
      { jobId: id },
      {
        enabled: canFetch,
      },
    ),
  );

  const { mutate: review } = useMutation(
    _trpc.jobs.jobReview.mutationOptions({
      onSuccess(_, variables) {
        _qc.invalidateQueries({
          queryKey: _trpc.jobs.overview.queryKey({ jobId: id }),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.jobs.getJobs.queryKey(),
        });
        Toast.show(
          variables.action === "approve" ? "Job approved" : "Job rejected",
          {
            type: "success",
          },
        );
      },
      onError() {
        Toast.show("Unable to update review", { type: "error" });
      },
      onSettled() {
        setPending(null);
      },
    }),
  );

  const runReview = (action: "approve" | "reject") => {
    if (!overview) return;
    setPending(action);
    review({
      action,
      jobId: overview.id,
      note: note.trim() ? note.trim() : undefined,
    });
  };

  if (isPending) {
    return (
      <SafeArea>
        <View className="flex-1 bg-background px-4 pt-4">
          <Skeleton className="h-24 rounded-3xl" />
        </View>
      </SafeArea>
    );
  }

  if (!overview) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center bg-background px-6">
          <Text className="text-base font-semibold text-foreground">
            Job not found.
          </Text>
        </View>
      </SafeArea>
    );
  }

  if (!adminMode) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center bg-background px-6">
          <Text className="text-base font-semibold text-foreground">
            Review access is for admins only.
          </Text>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <View className="flex-1 gap-4 bg-background px-4 py-4">
        <View className="flex-row items-center gap-3">
          <BackBtn />
          <View>
            <Text className="text-lg font-bold text-foreground">Job Review</Text>
            <Text className="text-xs text-muted-foreground">
              Job #{overview.id} • {overview.status}
            </Text>
          </View>
        </View>

        <View className="rounded-3xl border border-border bg-card p-4">
          <Text className="mb-2 text-sm font-bold text-foreground">
            Review Note (Optional)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            className="mb-3 min-h-24 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
            placeholder="Add a note for this decision..."
            placeholderTextColor="hsl(var(--muted-foreground))"
            textAlignVertical="top"
          />

          <View className="flex-row gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              onPress={() => runReview("reject")}
              disabled={pending !== null}
            >
              <Icon
                name="X"
                className="text-destructive-foreground"
                size={14}
              />
              <Text className="text-destructive-foreground">Reject</Text>
            </Button>
            <Button
              className="flex-1"
              onPress={() => runReview("approve")}
              disabled={pending !== null}
            >
              <Icon name="Check" className="text-primary-foreground" size={14} />
              <Text className="text-primary-foreground">Approve</Text>
            </Button>
          </View>
        </View>
      </View>
    </SafeArea>
  );
}
