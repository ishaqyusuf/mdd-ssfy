import { BackBtn } from "@/components/back-btn";
import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { _qc, _trpc } from "@/components/static-trpc";
import { Toast } from "@/components/ui/toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

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
      <View className="flex-1 bg-background px-4 pt-4">
        <View className="mb-5">
          <View className="flex-row items-center gap-3">
            <BackBtn />
            <View>
              <Text className="text-xl font-bold text-foreground">
                Job Review
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                Job #{overview.id} • {overview.status}
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-4">
          <View className="rounded-xl border border-input bg-background p-3">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
              Reviewing
            </Text>
            <Text className="mt-1 text-base font-semibold text-foreground">
              {overview.title}
            </Text>
            <Text className="mt-0.5 text-sm text-muted-foreground">
              {overview.subtitle || overview.home?.lotBlock || "Job"}
            </Text>
          </View>

          <View>
            <Text className="mb-2 text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
              Review Note
            </Text>
            <View className="rounded-xl border border-input bg-background px-3 py-2.5">
              <View className="flex-row items-start gap-2">
                <Icon
                  name="FilePenLine"
                  className="size-14 text-muted-foreground mt-1"
                />
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={4}
                  className="flex-1 min-h-24 text-foreground"
                  placeholder="Add a note (optional)"
                  placeholderTextColor="hsl(var(--muted-foreground))"
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          <View className="mt-1 flex-row gap-3">
            <Pressable
              disabled={pending !== null}
              onPress={() => runReview("reject")}
              className="h-11 flex-1 items-center justify-center rounded-xl border border-destructive/40 bg-destructive/10 active:opacity-80 disabled:opacity-40"
            >
              <View className="flex-row items-center gap-2">
                <Icon name="X" className="text-destructive" size={14} />
                <Text className="text-sm font-semibold text-destructive">
                  Reject
                </Text>
              </View>
            </Pressable>
            <Pressable
              disabled={pending !== null}
              onPress={() => runReview("approve")}
              className="h-11 flex-1 items-center justify-center rounded-xl bg-primary active:opacity-80 disabled:opacity-40"
            >
              <View className="flex-row items-center gap-2">
                <Icon name="Check" className="text-primary-foreground" size={14} />
                <Text className="text-sm font-semibold text-primary-foreground">
                  Approve
                </Text>
              </View>
            </Pressable>
          </View>

          <Text className="text-xs text-muted-foreground">
            Review note is optional for both approve and reject.
          </Text>
        </View>
      </View>
    </SafeArea>
  );
}
