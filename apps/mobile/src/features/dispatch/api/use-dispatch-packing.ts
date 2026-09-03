import { _trpc } from "@/components/static-trpc";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { invalidateDispatchQueries } from "./dispatch-query-invalidation";

import type { DispatchDeliverable, QtyMatrix } from "../types/dispatch.types";

type ConfirmPackingInput = RouterInputs["dispatch"]["confirmPacking"];

type PackItemInput = {
	dispatchId: number;
	expectedManifestRevision: string;
	expectedPipelineRevision?: string | null;
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
	expectedPipelineRevision?: string | null;
	requestedItems: ConfirmPackingInput["items"];
	replaceExisting?: boolean;
};

type ResetPackingInput = {
	dispatchId: number;
	expectedManifestRevision: string;
	expectedPipelineRevision?: string | null;
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
	const requestIds = useRef(new Map<string, string>());

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
	const runRetrySafe = async <T>(
		key: string,
		command: (requestId: string) => Promise<T>,
	) => {
		const requestId = requestIds.current.get(key) || crypto.randomUUID();
		requestIds.current.set(key, requestId);
		const result = await command(requestId);
		requestIds.current.delete(key);
		return result;
	};

	return {
		taskTrigger,
		deletePackingItem,
		resetPacking,
		invalidateDispatchQueries: invalidate,
		onPackItem(input: PackItemInput) {
			const key = `pack-item:${JSON.stringify(input)}`;
			return runRetrySafe(key, (requestId) => confirmPacking.mutateAsync({
				dispatchId: input.dispatchId,
				requestId,
				expectedManifestRevision: input.expectedManifestRevision,
				expectedPipelineRevision: input.expectedPipelineRevision || undefined,
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
			}));
		},
		onPackItemsSelection(input: PackItemsSelectionInput) {
			const key = `pack-selection:${JSON.stringify(input)}`;
			return runRetrySafe(key, (requestId) => confirmPacking.mutateAsync({
				dispatchId: input.dispatchId,
				requestId,
				expectedManifestRevision: input.expectedManifestRevision,
				expectedPipelineRevision: input.expectedPipelineRevision || undefined,
				replaceExisting: input.replaceExisting ?? false,
				items: input.requestedItems,
			}));
		},
		onClearPackings(input: ResetPackingInput) {
			const key = `reset-packing:${JSON.stringify(input)}`;
			return runRetrySafe(key, (requestId) => resetPacking.mutateAsync({
				dispatchId: input.dispatchId,
				requestId,
				expectedManifestRevision: input.expectedManifestRevision,
				expectedPipelineRevision: input.expectedPipelineRevision || undefined,
			}));
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
