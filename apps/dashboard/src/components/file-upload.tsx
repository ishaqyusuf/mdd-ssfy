import {
	type SupportedUploadContentType,
	resolveUploadContentType,
} from "@/lib/upload-content-type";
import { useTRPC } from "@/trpc/client";
import { cn } from "@gnd/ui/cn";
import type { IconKeys } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { useToast } from "@gnd/ui/use-toast";
import type { BlobPath } from "@gnd/utils/constants";
import { useMutation } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Accept } from "react-dropzone";
import { useDropzone } from "react-dropzone";

type Props = {
	children?: ReactNode;
	onUploadComplete?: (results: UploadedBlobResult[]) => void;
	path: BlobPath;
	label?: string;
	icon?: IconKeys;
	uploads?: {
		pathname: string;
	}[];
	accept?: Accept;
	maxFiles?: number;
	dragDescription?: string;
	dragActiveDescription?: string;
};

export { resolveUploadContentType };
export type { SupportedUploadContentType };

export type UploadedBlobResult = {
	url: string;
	downloadUrl: string;
	pathname: string;
	contentType: SupportedUploadContentType;
	size: number | null;
	storedDocumentId: string;
};

function readFileAsBase64(file: File) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () =>
			reject(reader.error || new Error("File read failed."));
		reader.onload = () => {
			const value = typeof reader.result === "string" ? reader.result : "";
			const separator = value.indexOf(",");
			if (separator < 0) {
				reject(new Error("File encoding failed."));
				return;
			}
			resolve(value.slice(separator + 1));
		};
		reader.readAsDataURL(file);
	});
}
const defaultAccept: Accept = {
	"image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".avif"],
	"application/pdf": [".pdf"],
};

export function FileUpload({
	children,
	path,
	label,
	onUploadComplete,
	accept = defaultAccept,
	maxFiles = 25,
	dragDescription,
	dragActiveDescription,
}: Props) {
	const trpc = useTRPC();
	const upload = useMutation(trpc.storage.upload.mutationOptions());
	const deleteUpload = useMutation(trpc.storage.delete.mutationOptions());
	const [progress, setProgress] = useState(0);
	const [showProgress, setShowProgress] = useState(false);
	const [toastId, setToastId] = useState<string | undefined>(undefined);
	const { toast, dismiss, update } = useToast();
	const uploadProgress = useRef<number[]>([]);
	const toastApiRef = useRef({ toast, dismiss, update });

	toastApiRef.current = { toast, dismiss, update };

	useEffect(() => {
		if (!toastId && showProgress) {
			const { id } = toastApiRef.current.toast({
				title: `Uploading ${uploadProgress.current.length} files`,
				progress,
				variant: "progress",
				description: "Please do not close browser until completed",
				duration: Number.POSITIVE_INFINITY,
			});

			if (id) {
				setToastId(id);
			}
		} else if (toastId) {
			toastApiRef.current.update(toastId, {
				id: toastId,
				progress,
				title: `Uploading ${uploadProgress.current.length} files`,
			});
		}
	}, [progress, showProgress, toastId]);

	const onDrop = async (files: File[]) => {
		// NOTE: If onDropRejected
		if (!files.length) {
			return;
		}

		// Set default progress
		uploadProgress.current = files.map(() => 0);
		setShowProgress(true);
		const results: UploadedBlobResult[] = [];
		try {
			for (const [idx, file] of files.entries()) {
				const result = await upload.mutateAsync({
					path,
					filename: file.name,
					contentType: resolveUploadContentType(file),
					content: await readFileAsBase64(file),
				});
				uploadProgress.current[idx] = 100;
				const totalProgress = uploadProgress.current.reduce(
					(sum, value) => sum + value,
					0,
				);
				setProgress(Math.round(totalProgress / files.length));
				results.push(result);
			}

			// Trigger the upload jobs
			// processAttachmentsMutation.mutate(
			//     results.map(
			//         (result): ProcessAttachmentInput => ({
			//             filePath: [...path, result.filename],
			//             mimetype: result.file.type,
			//             size: result.file.size,
			//         }),
			//     ),
			// );

			// Reset once done
			uploadProgress.current = [];

			setProgress(0);
			toastApiRef.current.toast({
				title: "Upload successful.",
				variant: "success",
				duration: 2000,
			});

			setShowProgress(false);
			setToastId(undefined);
			toastApiRef.current.dismiss(toastId);
			onUploadComplete?.(results);
		} catch (e) {
			await Promise.allSettled(
				results.map((result) =>
					deleteUpload.mutateAsync({
						pathname: result.pathname,
					}),
				),
			);
			uploadProgress.current = [];
			setProgress(0);
			setShowProgress(false);
			setToastId(undefined);
			toastApiRef.current.dismiss(toastId);
			toastApiRef.current.toast({
				duration: 2500,
				variant: "error",
				title: "Something went wrong please try again.",
			});
		}
	};

	const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
		onDrop,
		onDropRejected: ([reject]) => {
			if (reject?.errors.find(({ code }) => code === "file-too-large")) {
				toastApiRef.current.toast({
					duration: 2500,
					variant: "error",
					title: "File size to large.",
				});
			}

			if (reject?.errors.find(({ code }) => code === "file-invalid-type")) {
				toastApiRef.current.toast({
					duration: 2500,
					variant: "error",
					title: "File type not supported.",
				});
			}
		},
		maxSize: 5000000, // 5MB
		maxFiles,
		accept,
		noClick: true,
	});

	return (
		<div className="space-y-2">
			{!label || <Label>{label}</Label>}
			<div
				{...getRootProps({ onClick: (evt) => evt.stopPropagation() })}
				className="relative h-full"
			>
				<div className="absolute top-0 bottom-0 right-0 left-0 z-[51] pointer-events-none">
					<div
						className={cn(
							"bg-background dark:bg-[#1A1A1A] h-full flex items-center justify-center text-center invisible",
							isDragActive && "visible",
						)}
					>
						<p className="text-xs">
							{dragActiveDescription || dragDescription || "Drop files here."}
							<br />
							Maximum of {maxFiles} file{maxFiles === 1 ? "" : "s"} at a time.
						</p>
					</div>
				</div>

				<input className="hidden" {...getInputProps()} id="upload-files" />
				<button
					type="button"
					className="block w-full text-left"
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						open();
					}}
				>
					{children}
				</button>
			</div>
		</div>
	);
}
