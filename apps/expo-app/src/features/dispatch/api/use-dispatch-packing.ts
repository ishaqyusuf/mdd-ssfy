import { _trpc } from "@/components/static-trpc";
import { useAuthContext } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  buildPackingPayload,
  hasQty,
} from "../lib/packing-payload";
import { buildPackItemTaskPayload } from "./pack-task-payload";
import {
  DispatchDeliverable,
  DispatchStatus,
  QtyMatrix,
} from "../types/dispatch.types";

type PackingMetaInput = {
  salesId: number;
  dispatchId: number;
};

type PackItemInput = PackingMetaInput & {
  salesItemId: number;
  enteredQty: QtyMatrix;
  deliverables: DispatchDeliverable[];
  dispatchStatus: DispatchStatus;
  note?: string;
};

type DeletePackingInput = {
  salesId: number;
  packingId?: number | null;
  packingUid?: string | null;
};

function getAuthor(profile: ReturnType<typeof useAuthContext>["profile"]) {
  const id = profile?.user?.id;
  const name = profile?.user?.name;
  if (!id || !name) {
    throw new Error("Missing authenticated user");
  }
  return { id, name };
}

export function useDispatchPacking() {
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

  const taskTrigger = useMutation(
    _trpc.taskTrigger.trigger.mutationOptions({
      async onSuccess() {
        await invalidateDispatchQueries();
      },
    }),
  );

  const deletePackingItem = useMutation(
    _trpc.dispatch.deletePackingItem.mutationOptions({
      async onSuccess() {
        await invalidateDispatchQueries();
      },
    }),
  );

  return {
    taskTrigger,
    deletePackingItem,
    invalidateDispatchQueries,
    onPackItem(input: PackItemInput) {
      const author = getAuthor(auth.profile);
      const packed = buildPackingPayload({
        salesItemId: input.salesItemId,
        note: input.note,
        enteredQty: input.enteredQty,
        deliverables: input.deliverables,
      });
      if (hasQty(packed.remainder)) {
        throw new Error("Unable to allocate full packing quantity");
      }

      return taskTrigger.mutateAsync(
        buildPackItemTaskPayload({
          salesId: input.salesId,
          dispatchId: input.dispatchId,
          dispatchStatus: input.dispatchStatus,
          authorId: author.id,
          authorName: author.name,
          packingLines: packed.packingLines,
        }),
      );
    },
    onClearPackings(input: PackingMetaInput) {
      const author = getAuthor(auth.profile);
      return taskTrigger.mutateAsync({
        taskName: "update-sales-control",
        payload: {
          meta: {
            salesId: input.salesId,
            authorId: author.id,
            authorName: author.name,
          },
          clearPackings: {
            dispatchId: input.dispatchId,
          },
        },
      });
    },
    onDeletePackingItem(input: DeletePackingInput) {
      const author = getAuthor(auth.profile);
      return deletePackingItem.mutateAsync({
        salesId: input.salesId,
        packingId: input.packingId,
        packingUid: input.packingUid,
        deleteBy: author.name,
      });
    },
    canEditPacking(status?: DispatchStatus | null) {
      return status === "queue" || status === "in progress";
    },
  };
}
