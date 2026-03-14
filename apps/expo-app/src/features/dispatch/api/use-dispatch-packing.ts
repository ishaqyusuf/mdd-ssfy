import { _trpc } from "@/components/static-trpc";
import { useAuthContext } from "@/hooks/use-auth";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  buildPackingPayload,
  hasQty,
  type PackingLine,
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

type PackItemsSelectionInput = PackingMetaInput & {
  dispatchStatus: DispatchStatus;
  packingLines: PackingLine[];
  requestedItems?: {
    salesItemId: number;
    itemUid?: string;
    title?: string;
    qty: QtyMatrix;
    note?: string;
  }[];
  replaceExisting?: boolean;
};

type DeletePackingInput = {
  salesId: number;
  packingId?: number | null;
  packingUid?: string | null;
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

export function useDispatchPacking() {
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

  const packingTask = useTaskTrigger({
    taskName: "update-sales-control",
    onCompleted: invalidateDispatchQueries,
  });

  const deletePackingItem = useMutation(
    _trpc.dispatch.deletePackingItem.mutationOptions({
      async onSuccess() {
        await invalidateDispatchQueries();
      },
    }),
  );

  const taskTrigger = {
    ...packingTask,
    isPending:
      packingTask.isStarting ||
      packingTask.isQueued ||
      packingTask.isExecuting ||
      packingTask.isCheckingStatus,
  };

  return {
    taskTrigger,
    deletePackingItem,
    invalidateDispatchQueries,
    async onPackItem(input: PackItemInput) {
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

      return packingTask.startAndWait(
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
    async onPackItemsSelection(input: PackItemsSelectionInput) {
      const author = getAuthor(auth.profile);
      return packingTask.startAndWait({
        payload: {
          meta: {
            salesId: input.salesId,
            authorId: author.id,
            authorName: author.name,
          },
          packItems: {
            dispatchId: input.dispatchId,
            dispatchStatus: input.dispatchStatus,
          packMode: "selection",
          replaceExisting: input.replaceExisting ?? false,
          requestedItems: input.requestedItems,
          packingLines: input.packingLines,
        },
      },
      });
    },
    async onClearPackings(input: PackingMetaInput) {
      const author = getAuthor(auth.profile);
      return packingTask.startAndWait({
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
      return (
        status === "queue" || status === "packed" || status === "in progress"
      );
    },
  };
}
