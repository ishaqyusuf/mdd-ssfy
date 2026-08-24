import { _trpc } from "@/components/static-trpc";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDispatchQueries } from "./dispatch-query-invalidation";

import type { DispatchDeliverable, QtyMatrix } from "../types/dispatch.types";

type ConfirmPackingInput = RouterInputs["dispatch"]["confirmPacking"];

type PackItemInput = {
	dispatchId: number;
	expectedManifestRevision: string;
	salesItemId: number;
	itemUid?: string | null;
	title?: string | null;
	enteredQty: QtyMatrix;
	deliverables?: DispatchDeliverable[];
	note?: string;
};

type PackItemsSelectionInput = {
	dispatchId: number;
	expectedManifestRevision: string;
	requestedItems: ConfirmPackingInput["items"];
	replaceExisting?: boolean;
};

type ResetPackingInput = {
	dispatchId: number;
	expectedManifestRevision: string;
};

type DeletePackingInput = {
	salesId: number;
	packingId?: number | null;
	packingUid?: string | null;
};

function toCommandQty(value: QtyMatrix) {
	return {
		qty: Math.max(0, Number(value.qty || 0)),
		lh: Math.max(0, Number(value.lh || 0)),
		rh: Math.max(0, Number(value.rh || 0)),
	};
}

export function useDispatchPacking() {
	const queryClient = useQueryClient();

	const invalidate = () => invalidateDispatchQueries(queryClient);

	const confirmPacking = useMutation(
		_trpc.dispatch.confirmPacking.mutationOptions({
			onSuccess: invalidate,
			onError: invalidate,
		}),
	);
	const resetPacking = useMutation(
		_trpc.dispatch.resetPacking.mutationOptions({
			onSuccess: invalidate,
			onError: invalidate,
		}),
	);
	const deletePackingItem = useMutation(
		_trpc.dispatch.deletePackingItem.mutationOptions({
			async onSuccess() {
				await invalidate();
			},
		}),
	);

	const taskTrigger = {
		...confirmPacking,
		isPending: confirmPacking.isPending || resetPacking.isPending,
	};

	return {
		taskTrigger,
		deletePackingItem,
		resetPacking,
		invalidateDispatchQueries: invalidate,
		onPackItem(input: PackItemInput) {
			return confirmPacking.mutateAsync({
				dispatchId: input.dispatchId,
				requestId: crypto.randomUUID(),
				expectedManifestRevision: input.expectedManifestRevision,
				replaceExisting: false,
				items: [
					{
						salesItemId: input.salesItemId,
						itemUid: input.itemUid,
						title: input.title,
						qty: toCommandQty(input.enteredQty),
						note: input.note,
					},
				],
			});
		},
		onPackItemsSelection(input: PackItemsSelectionInput) {
			return confirmPacking.mutateAsync({
				dispatchId: input.dispatchId,
				requestId: crypto.randomUUID(),
				expectedManifestRevision: input.expectedManifestRevision,
				replaceExisting: input.replaceExisting ?? false,
				items: input.requestedItems,
			});
		},
		onClearPackings(input: ResetPackingInput) {
			return resetPacking.mutateAsync({
				dispatchId: input.dispatchId,
				requestId: crypto.randomUUID(),
				expectedManifestRevision: input.expectedManifestRevision,
			});
		},
		onDeletePackingItem(input: DeletePackingInput) {
			return deletePackingItem.mutateAsync({
				salesId: input.salesId,
				packingId: input.packingId,
				packingUid: input.packingUid,
			});
		},
	};
}
