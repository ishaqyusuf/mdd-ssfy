import { useTRPC } from "@/trpc/client";
import { useToast } from "@gnd/ui/use-toast";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@gnd/ui/cn";
import { useMutation } from "@tanstack/react-query";
import type { UploadedBlobResult } from "../file-upload";
import { resolveUploadContentType } from "../file-upload";

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
type Props = {
	children: ReactNode;
	onUploadComplete?: (results: UploadedBlobResult[]) => void;
};
export function InboundDocumentUploadZone({
	children,
	onUploadComplete,
}: Props) {
	const trpc = useTRPC();
	const upload = useMutation(trpc.storage.upload.mutationOptions());
	const deleteUpload = useMutation(trpc.storage.delete.mutationOptions());
	const [progress, setProgress] = useState(0);
	const [showProgress, setShowProgress] = useState(false);
	const [toastId, setToastId] = useState<string | undefined>(undefined);
	const { toast, dismiss, update } = useToast();
	const uploadProgress = useRef<number[]>([]);
	const toastApiRef = useRef({ toast, update });
	toastApiRef.current = { toast, update };
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
	}, [showProgress, progress, toastId]);

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
					path: "inbound-documents",
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
			toast({
				title: "Upload successful.",
				variant: "success",
				duration: 2000,
			});

			setShowProgress(false);
			setToastId(undefined);
			dismiss(toastId);
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
			dismiss(toastId);
			toast({
				duration: 2500,
				variant: "error",
				title: "Something went wrong please try again.",
			});
		}
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		onDropRejected: ([reject]) => {
			if (reject?.errors.find(({ code }) => code === "file-too-large")) {
				toast({
					duration: 2500,
					variant: "error",
					title: "File size to large.",
				});
			}

			if (reject?.errors.find(({ code }) => code === "file-invalid-type")) {
				toast({
					duration: 2500,
					variant: "error",
					title: "File type not supported.",
				});
			}
		},
		maxSize: 5000000, // 5MB
		maxFiles: 25,
		accept: {
			"image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".avif"],
			"application/pdf": [".pdf"],
		},
	});

	return (
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
					<input className="" {...getInputProps()} id="upload-files" />
					<p className="text-xs">
						Drop your receipts here. <br />
						Maximum of 25 files at a time.
					</p>
				</div>
			</div>

			{children}
		</div>
	);
}
