"use client";

import { useTRPCClient } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { FileText, ImageIcon, LoaderCircle, Paperclip, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	ASSISTANT_ATTACHMENT_MAX_FILES,
	type AssistantAttachment,
	type AssistantAttachmentMimeType,
	assistantAttachmentMimeTypes,
	readAssistantAttachment,
	validateAssistantAttachment,
	validateAssistantAttachmentTotal,
} from "./assistant-attachments";
import styles from "./assistant.module.css";

export function useAssistantAttachments() {
	const client = useTRPCClient();
	const [attachments, setAttachments] = useState<AssistantAttachment[]>([]);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const countRef = useRef(0);
	const generationRef = useRef(0);
	const queueRef = useRef<Promise<void>>(Promise.resolve());
	const attachmentsRef = useRef<AssistantAttachment[]>([]);
	const mountedRef = useRef(true);
	countRef.current = attachments.length;
	attachmentsRef.current = attachments;

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			generationRef.current += 1;
			for (const attachment of attachmentsRef.current) {
				URL.revokeObjectURL(attachment.previewUrl);
				void client.storage.delete
					.mutate({ pathname: attachment.pathname })
					.catch(() => undefined);
			}
		};
	}, [client]);

	const addFiles = useCallback(
		async (files: File[]) => {
			if (!files.length) return;
			const generation = generationRef.current;
			setError(null);
			setUploading(true);
			const upload = queueRef.current
				.catch(() => undefined)
				.then(async () => {
					if (generation !== generationRef.current) return;
					if (
						countRef.current + files.length >
						ASSISTANT_ATTACHMENT_MAX_FILES
					) {
						throw new Error("You can attach up to five files to one message.");
					}
					validateAssistantAttachmentTotal(attachmentsRef.current, files);
					for (const file of files) {
						await validateAssistantAttachment(file);
						const uploaded = await client.storage.upload.mutate({
							path: "assistant-documents",
							filename: file.name,
							contentType: file.type as AssistantAttachmentMimeType,
							content: await readAssistantAttachment(file),
						});
						if (generation !== generationRef.current) {
							await client.storage.delete.mutate({
								pathname: uploaded.pathname,
							});
							continue;
						}
						countRef.current += 1;
						const previewUrl = URL.createObjectURL(file);
						setAttachments((current) => [
							...current,
							{
								id: uploaded.storedDocumentId,
								name: file.name,
								mimeType: file.type as AssistantAttachmentMimeType,
								size: uploaded.size ?? file.size,
								pathname: uploaded.pathname,
								previewUrl,
							},
						]);
					}
				});
			queueRef.current = upload;
			try {
				await upload;
			} catch (cause) {
				if (mountedRef.current) {
					setError(cause instanceof Error ? cause.message : "Upload failed.");
				}
			} finally {
				if (queueRef.current === upload && mountedRef.current) {
					setUploading(false);
				}
			}
		},
		[client],
	);

	const remove = useCallback(
		(attachment: AssistantAttachment) => {
			URL.revokeObjectURL(attachment.previewUrl);
			setAttachments((current) =>
				current.filter((item) => item.id !== attachment.id),
			);
			void client.storage.delete
				.mutate({ pathname: attachment.pathname })
				.catch(() =>
					setError(`Could not remove ${attachment.name}. Try again.`),
				);
		},
		[client],
	);

	return {
		attachments,
		uploading,
		error,
		addFiles,
		remove,
		discard: () => {
			generationRef.current += 1;
			for (const attachment of attachments) {
				URL.revokeObjectURL(attachment.previewUrl);
				void client.storage.delete
					.mutate({ pathname: attachment.pathname })
					.catch(() => undefined);
			}
			setAttachments([]);
			setError(null);
		},
		clear: () => {
			generationRef.current += 1;
			for (const attachment of attachments) {
				URL.revokeObjectURL(attachment.previewUrl);
			}
			setAttachments([]);
			setError(null);
		},
	};
}

export function AssistantAttachmentPicker(props: {
	attachments: AssistantAttachment[];
	uploading: boolean;
	error: string | null;
	onAdd: (files: File[]) => void;
	onRemove: (attachment: AssistantAttachment) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	return (
		<div className={styles.attachmentArea}>
			<input
				ref={inputRef}
				type="file"
				hidden
				multiple
				accept={assistantAttachmentMimeTypes.join(",")}
				onChange={(event) => {
					props.onAdd(Array.from(event.target.files ?? []));
					event.target.value = "";
				}}
			/>
			<Button
				type="button"
				size="sm"
				variant="ghost"
				disabled={props.uploading}
				onClick={() => inputRef.current?.click()}
			>
				{props.uploading ? (
					<LoaderCircle className={styles.spin} size={14} />
				) : (
					<Paperclip size={14} />
				)}
				Attach
			</Button>
			{props.attachments.map((attachment) => (
				<span className={styles.attachmentChip} key={attachment.id}>
					<a
						href={attachment.previewUrl}
						target="_blank"
						rel="noreferrer"
						aria-label={`Preview ${attachment.name}`}
					>
						{attachment.mimeType.startsWith("image/") ? (
							<>
								<img src={attachment.previewUrl} alt="" />
								<ImageIcon size={13} />
							</>
						) : (
							<FileText size={13} />
						)}
						{attachment.name}
					</a>
					<button
						type="button"
						aria-label={`Remove ${attachment.name}`}
						onClick={() => props.onRemove(attachment)}
					>
						<X size={12} />
					</button>
				</span>
			))}
			{props.error ? (
				<span className={styles.attachmentError} role="alert">
					{props.error}
				</span>
			) : null}
		</div>
	);
}
