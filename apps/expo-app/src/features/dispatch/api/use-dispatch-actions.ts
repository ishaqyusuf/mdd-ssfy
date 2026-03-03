import { _trpc } from "@/components/static-trpc";
import { useAuthContext } from "@/hooks/use-auth";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type DispatchOverview = RouterOutputs["dispatch"]["dispatchOverview"];
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

function getAuthor(profile: ReturnType<typeof useAuthContext>["profile"]) {
  const id = profile?.user?.id;
  const name = profile?.user?.name;
  if (!id || !name) {
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
        queryKey: _trpc.dispatch.dispatchOverview.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: _trpc.dispatch.assignedDispatch.queryKey(),
      }),
    ]);
  };

  const startDispatch = useMutation(
    _trpc.dispatch.startDispatch.mutationOptions({
      async onSuccess() {
        await invalidateDispatchQueries();
      },
    }),
  );

  const cancelDispatch = useMutation(
    _trpc.dispatch.cancelDispatch.mutationOptions({
      async onSuccess() {
        await invalidateDispatchQueries();
      },
    }),
  );

  const submitDispatch = useMutation(
    _trpc.dispatch.submitDispatch.mutationOptions({
      async onSuccess() {
        await invalidateDispatchQueries();
      },
    }),
  );

  return {
    startDispatch,
    cancelDispatch,
    submitDispatch,
    invalidateDispatchQueries,
    onStartDispatch(input: DispatchMeta) {
      const author = getAuthor(auth.profile);
      return startDispatch.mutateAsync({
        meta: {
          salesId: input.salesId,
          authorId: author.id,
          authorName: author.name,
        },
        startDispatch: {
          dispatchId: input.dispatchId,
        },
      });
    },
    onCancelDispatch(input: DispatchMeta) {
      const author = getAuthor(auth.profile);
      return cancelDispatch.mutateAsync({
        meta: {
          salesId: input.salesId,
          authorId: author.id,
          authorName: author.name,
        },
        cancelDispatch: {
          dispatchId: input.dispatchId,
        },
      });
    },
    onSubmitDispatch(input: SubmitDispatchInput) {
      const author = getAuthor(auth.profile);
      return submitDispatch.mutateAsync({
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
      });
    },
    canStart(status?: DispatchStatus | null) {
      return status === "queue" || status === "cancelled";
    },
    canCancel(status?: DispatchStatus | null) {
      return status === "in progress";
    },
    canComplete(status?: DispatchStatus | null) {
      return status === "in progress";
    },
  };
}
