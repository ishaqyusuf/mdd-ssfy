"use client";

import { useFilePreviewParams } from "@/hooks/use-file-preview-params";
import type { AssistantEntityReference } from "@api/assistant/contracts";
import { Button } from "@gnd/ui/button";
import { ExternalLink, FileText, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { FileViewer } from "../file-viewer";
import { buildAssistantDocumentUrl } from "./assistant-entities";
import styles from "./assistant.module.css";

export type AssistantDocumentArtifact = Extract<
	AssistantEntityReference,
	{ kind: "document" }
>;

type AssistantDialogController = Pick<
	HTMLDialogElement,
	"open" | "close" | "show" | "showModal"
>;

export function syncAssistantArtifactDialogMode(
	dialog: AssistantDialogController,
	compact: boolean,
) {
	if (dialog.open) dialog.close();
	if (compact) dialog.showModal();
	else dialog.show();
}

export function assistantArtifactDialogAttributes(compact: boolean) {
	return { "aria-modal": compact } as const;
}

export function AssistantArtifactCanvas({
	document,
	onClose,
}: {
	document: AssistantDocumentArtifact | null;
	onClose: () => void;
}) {
	const filePreview = useFilePreviewParams();
	const canvasRef = useRef<HTMLDialogElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const titleId = useId();
	const documentId = document?.id;
	const [compact, setCompact] = useState(false);
	useEffect(() => {
		if (!documentId) return;
		const previousFocus = globalThis.document
			.activeElement as HTMLElement | null;
		const media = window.matchMedia("(max-width: 700px)");
		const syncDialogMode = () => {
			const dialog = canvasRef.current;
			if (!dialog) return;
			setCompact(media.matches);
			syncAssistantArtifactDialogMode(dialog, media.matches);
		};
		syncDialogMode();
		media.addEventListener("change", syncDialogMode);
		closeButtonRef.current?.focus();
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
				return;
			}
			if (event.key !== "Tab" || !media.matches) return;
			const focusable = canvasRef.current?.querySelectorAll<HTMLElement>(
				'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
			);
			if (!focusable?.length) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (event.shiftKey && globalThis.document.activeElement === first) {
				event.preventDefault();
				last?.focus();
			} else if (
				!event.shiftKey &&
				globalThis.document.activeElement === last
			) {
				event.preventDefault();
				first?.focus();
			}
		};
		globalThis.document.addEventListener("keydown", onKeyDown);
		return () => {
			media.removeEventListener("change", syncDialogMode);
			globalThis.document.removeEventListener("keydown", onKeyDown);
			if (canvasRef.current?.open) canvasRef.current.close();
			previousFocus?.focus();
		};
	}, [documentId, onClose]);
	if (!document) return null;
	const mimeType = document.mimeType ?? "application/octet-stream";
	const url = buildAssistantDocumentUrl(document.id);

	return (
		<dialog
			ref={canvasRef}
			className={styles.artifactCanvas}
			{...assistantArtifactDialogAttributes(compact)}
			aria-labelledby={titleId}
			data-artifact-id={document.id}
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
		>
			<header>
				<div>
					<FileText size={17} />
					<span>
						<small>Artifact preview</small>
						<strong id={titleId}>{document.label}</strong>
					</span>
				</div>
				<Button
					ref={closeButtonRef}
					type="button"
					variant="ghost"
					size="icon"
					onClick={onClose}
					aria-label="Close artifact preview"
				>
					<X size={17} />
				</Button>
			</header>
			<div className={styles.artifactViewport} key={`${document.id}:${url}`}>
				<FileViewer mimeType={mimeType} url={url} maxWidth={565} />
			</div>
			<footer>
				<Button
					type="button"
					variant="outline"
					onClick={() =>
						void filePreview.setParams({
							documentId: document.id,
							filePath: null,
							mimeType:
								mimeType === "application/pdf" ? "application/pdf" : null,
						})
					}
				>
					Open in document viewer <ExternalLink size={14} />
				</Button>
			</footer>
		</dialog>
	);
}
