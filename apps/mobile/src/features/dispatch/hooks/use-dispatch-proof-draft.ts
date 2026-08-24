import { useCallback, useEffect, useRef, useState } from "react";

import type { UploadImageMimeType } from "@/lib/upload-image-mime";
import {
	type DispatchProofDraft,
	type DispatchProofDraftAttachment,
	PROOF_MAX_FILES,
	PROOF_MAX_TOTAL_BYTES,
	clearDispatchProofDraft,
	createDispatchProofDraft,
	deleteDispatchProofAttachment,
	loadDispatchProofDraft,
	readDispatchProofAttachment,
	saveDispatchProofDraft,
	stageDispatchProofAttachment,
} from "../lib/dispatch-proof-draft-storage";

type AttachmentCandidate = {
	clientId: string;
	fileName: string;
	contentType: UploadImageMimeType;
	uri: string;
};

export function useDispatchProofDraft(input: {
	userId: number;
	dispatchId: number;
	defaultReceivedBy?: string;
	manifestRevision: string;
}) {
	const [draft, setDraft] = useState(() =>
		createDispatchProofDraft(
			input.userId,
			input.dispatchId,
			input.defaultReceivedBy,
			input.manifestRevision,
		),
	);
	const [isHydrated, setHydrated] = useState(false);
	const mountedRef = useRef(true);
	const skipNextPersistRef = useRef(false);
	const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const persistEpochRef = useRef(0);
	const persistPromiseRef = useRef<Promise<void> | null>(null);
	const initialDefaultReceivedByRef = useRef(input.defaultReceivedBy);
	const initialManifestRevisionRef = useRef(input.manifestRevision);

	useEffect(() => {
		mountedRef.current = true;
		void loadDispatchProofDraft(input.userId, input.dispatchId)
			.then((stored) => {
				if (!mountedRef.current) return;
				setDraft(
					stored
						? {
								...stored,
								manifestRevision:
									stored.manifestRevision || initialManifestRevisionRef.current,
							}
						: createDispatchProofDraft(
								input.userId,
								input.dispatchId,
								initialDefaultReceivedByRef.current,
								initialManifestRevisionRef.current,
							),
				);
				setHydrated(true);
			})
			.catch(() => {
				if (!mountedRef.current) return;
				setDraft(
					createDispatchProofDraft(
						input.userId,
						input.dispatchId,
						initialDefaultReceivedByRef.current,
						initialManifestRevisionRef.current,
					),
				);
				setHydrated(true);
			});
		return () => {
			mountedRef.current = false;
		};
	}, [input.dispatchId, input.userId]);

	useEffect(() => {
		if (!isHydrated) return;
		if (skipNextPersistRef.current) {
			skipNextPersistRef.current = false;
			return;
		}
		const persistEpoch = persistEpochRef.current;
		const timeout = setTimeout(() => {
			if (persistEpoch !== persistEpochRef.current) return;
			const persistence = saveDispatchProofDraft(draft).finally(() => {
				if (persistPromiseRef.current === persistence) {
					persistPromiseRef.current = null;
				}
			});
			persistPromiseRef.current = persistence;
		}, 250);
		persistTimerRef.current = timeout;
		return () => {
			clearTimeout(timeout);
			if (persistTimerRef.current === timeout) persistTimerRef.current = null;
		};
	}, [draft, isHydrated]);

	const update = useCallback((values: Partial<DispatchProofDraft>) => {
		setDraft((current) => ({
			...current,
			...values,
			updatedAt: new Date().toISOString(),
		}));
	}, []);

	const addAttachments = useCallback(
		async (candidates: AttachmentCandidate[]) => {
			const remainingSlots = Math.max(
				0,
				PROOF_MAX_FILES - draft.attachments.length,
			);
			const accepted = candidates.slice(0, remainingSlots);
			const staged: DispatchProofDraftAttachment[] = [];
			let totalBytes = draft.attachments.reduce(
				(total, attachment) => total + attachment.byteSize,
				0,
			);
			try {
				for (const candidate of accepted) {
					const attachment = await stageDispatchProofAttachment({
						userId: draft.userId,
						dispatchId: draft.dispatchId,
						clientId: candidate.clientId,
						fileName: candidate.fileName,
						contentType: candidate.contentType,
						sourceUri: candidate.uri,
					});
					if (totalBytes + attachment.byteSize > PROOF_MAX_TOTAL_BYTES) {
						await deleteDispatchProofAttachment(attachment.uri);
						throw new Error(
							"Proof photos must be smaller than 10 MB combined.",
						);
					}
					totalBytes += attachment.byteSize;
					staged.push(attachment);
				}
			} catch (error) {
				await Promise.all(
					staged.map((attachment) =>
						deleteDispatchProofAttachment(attachment.uri),
					),
				);
				throw error;
			}
			update({ attachments: [...draft.attachments, ...staged] });
			return staged.length;
		},
		[draft, update],
	);

	const removeAttachment = useCallback(
		async (uri: string) => {
			await deleteDispatchProofAttachment(uri);
			update({
				attachments: draft.attachments.filter((item) => item.uri !== uri),
			});
		},
		[draft.attachments, update],
	);

	const buildAttachments = useCallback(async () => {
		const totalBytes = draft.attachments.reduce(
			(total, attachment) => total + attachment.byteSize,
			0,
		);
		if (totalBytes > PROOF_MAX_TOTAL_BYTES) {
			throw new Error("Proof photos must be smaller than 10 MB combined.");
		}
		return Promise.all(
			draft.attachments.map(async (attachment) => ({
				clientId: attachment.clientId,
				fileName: attachment.fileName,
				contentType: attachment.contentType,
				base64: await readDispatchProofAttachment(attachment),
				uri: attachment.uri,
			})),
		);
	}, [draft.attachments]);

	const clear = useCallback(async () => {
		persistEpochRef.current += 1;
		skipNextPersistRef.current = true;
		if (persistTimerRef.current) {
			clearTimeout(persistTimerRef.current);
			persistTimerRef.current = null;
		}
		await persistPromiseRef.current?.catch(() => undefined);
		await clearDispatchProofDraft(draft.userId, draft.dispatchId);
		setDraft(
			createDispatchProofDraft(
				draft.userId,
				draft.dispatchId,
				input.defaultReceivedBy,
				input.manifestRevision,
			),
		);
	}, [
		draft.dispatchId,
		draft.userId,
		input.defaultReceivedBy,
		input.manifestRevision,
	]);

	return {
		draft,
		isHydrated,
		update,
		addAttachments,
		removeAttachment,
		buildAttachments,
		clear,
	};
}
