import { _trpc } from "@/components/static-trpc";
import type { UploadImageMimeType } from "@/lib/upload-image-mime";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDispatchQueries } from "./dispatch-query-invalidation";

type SubmitDispatchInput = {
	dispatchId: number;
	requestId: string;
	expectedManifestRevision: string;
	receivedBy?: string | null;
	note?: string;
	signaturePath: string;
	attachments?: {
		clientId: string;
		fileName: string;
		contentType: UploadImageMimeType;
		base64: string;
	}[];
};

type ReportDispatchExceptionInput = {
	dispatchId: number;
	reasonCode:
		| "wrong_address"
		| "customer_not_home"
		| "damaged_items"
		| "access_issue"
		| "other";
	notes?: string | null;
	requestId: string;
};

export function useDispatchActions() {
	const queryClient = useQueryClient();

	const invalidate = () => invalidateDispatchQueries(queryClient);

	const startDispatch = useMutation(
		_trpc.dispatch.startTrip.mutationOptions({
			onSuccess: invalidate,
		}),
	);
	const submitDispatch = useMutation(
		_trpc.dispatch.completeDispatchWithProof.mutationOptions({
			onSuccess: invalidate,
		}),
	);
	const reportException = useMutation(
		_trpc.dispatch.reportException.mutationOptions({
			onSuccess: invalidate,
		}),
	);

	return {
		startDispatch,
		submitDispatch,
		reportException,
		invalidateDispatchQueries: invalidate,
		onStartDispatch(input: { dispatchId: number }) {
			return startDispatch.mutateAsync({
				dispatchId: input.dispatchId,
				requestId: crypto.randomUUID(),
			});
		},
		onSubmitDispatch(input: SubmitDispatchInput) {
			return submitDispatch.mutateAsync({
				dispatchId: input.dispatchId,
				requestId: input.requestId,
				expectedManifestRevision: input.expectedManifestRevision,
				receivedBy: input.receivedBy || undefined,
				note: input.note,
				signaturePath: input.signaturePath,
				attachments: input.attachments || [],
			});
		},
		onReportException(input: ReportDispatchExceptionInput) {
			return reportException.mutateAsync({
				dispatchId: input.dispatchId,
				reasonCode: input.reasonCode,
				notes: input.notes,
				requestId: input.requestId,
			});
		},
	};
}
