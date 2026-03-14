import { _trpc } from "@/components/static-trpc";
import { useAuthContext } from "@/hooks/use-auth";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type DispatchOverview = RouterOutputs["dispatch"]["dispatchOverviewV2"];
type DispatchStatus = NonNullable<DispatchOverview["dispatch"]>["status"];

type DispatchMeta = {
  salesId: number;
  dispatchId: number;
};
type SubmitDispatchInput = DispatchMeta & {
  receivedBy?: string | null;
  receivedDate?: Date | null;
  note?: string;
  signature?: string | null;
  attachments?: { pathname: string }[] | null;
};

type UpdateDispatchStatusInput = DispatchMeta & {
  oldStatus?: DispatchStatus | null;
  newStatus: DispatchStatus;
};

function getAuthor(profile: ReturnType<typeof useAuthContext>["profile"]) {
  const rawId = profile?.user?.id;
  const id = Number(rawId);
  const name = profile?.user?.name;
  if (!Number.isFinite(id) || id <= 0 || !name) {
    throw new Error("Missing authenticated user");
  }
  return { id, name };
}

export function useDispatchActions() {
  const queryClient = useQueryClient();
  const auth = useAuthContext();

  const invalidateDispatchQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: _trpc.dispatch.dispatchOverviewV2.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: _trpc.dispatch.assignedDispatch.queryKey(),
      }),
    ]);
  };

  const startDispatchTask = useTaskTrigger({
    taskName: "update-sales-control",
    onCompleted: invalidateDispatchQueries,
  });
  const cancelDispatchTask = useTaskTrigger({
    taskName: "update-sales-control",
    onCompleted: invalidateDispatchQueries,
  });
  const submitDispatchTask = useTaskTrigger({
    taskName: "update-sales-control",
    onCompleted: invalidateDispatchQueries,
  });
  const updateDispatchStatusMutation = useMutation(
    _trpc.dispatch.updateDispatchStatus.mutationOptions({
      onSuccess: invalidateDispatchQueries,
    }),
  );

  const startDispatch = {
    ...startDispatchTask,
    isPending:
      startDispatchTask.isStarting ||
      startDispatchTask.isQueued ||
      startDispatchTask.isExecuting ||
      startDispatchTask.isCheckingStatus,
  };
  const cancelDispatch = {
    ...cancelDispatchTask,
    isPending:
      cancelDispatchTask.isStarting ||
      cancelDispatchTask.isQueued ||
      cancelDispatchTask.isExecuting ||
      cancelDispatchTask.isCheckingStatus,
  };
  const submitDispatch = {
    ...submitDispatchTask,
    isPending:
      submitDispatchTask.isStarting ||
      submitDispatchTask.isQueued ||
      submitDispatchTask.isExecuting ||
      submitDispatchTask.isCheckingStatus,
  };

  return {
    startDispatch,
    cancelDispatch,
    submitDispatch,
    updateDispatchStatus: updateDispatchStatusMutation,
    invalidateDispatchQueries,
    onStartDispatch(input: DispatchMeta) {
      const author = getAuthor(auth.profile);
      return startDispatchTask.startAndWait({
        payload: {
          meta: {
            salesId: input.salesId,
            authorId: author.id,
            authorName: author.name,
          },
          startDispatch: {
            dispatchId: input.dispatchId,
          },
        },
      });
    },
    onCancelDispatch(input: DispatchMeta) {
      const author = getAuthor(auth.profile);
      return cancelDispatchTask.startAndWait({
        payload: {
          meta: {
            salesId: input.salesId,
            authorId: author.id,
            authorName: author.name,
          },
          cancelDispatch: {
            dispatchId: input.dispatchId,
          },
        },
      });
    },
    onSubmitDispatch(input: SubmitDispatchInput) {
      const author = getAuthor(auth.profile);
      return submitDispatchTask.startAndWait({
        payload: {
          meta: {
            salesId: input.salesId,
            authorId: author.id,
            authorName: author.name,
          },
          submitDispatch: {
            dispatchId: input.dispatchId,
            receivedBy: input.receivedBy,
            receivedDate: input.receivedDate,
            note: input.note,
            signature: input.signature,
            attachments: input.attachments,
          },
        },
      });
    },
    onUpdateDispatchStatus(input: UpdateDispatchStatusInput) {
      return updateDispatchStatusMutation.mutateAsync({
        dispatchId: input.dispatchId,
        oldStatus: (input.oldStatus || "queue") as any,
        newStatus: input.newStatus as any,
      });
    },
    canStart(status?: DispatchStatus | null) {
      return status === "queue" || status === "packed" || status === "cancelled";
    },
    canCancel(status?: DispatchStatus | null) {
      return status === "in progress" || status === "packed";
    },
    canComplete(status?: DispatchStatus | null) {
      return status === "in progress" || status === "packed";
    },
  };
}
