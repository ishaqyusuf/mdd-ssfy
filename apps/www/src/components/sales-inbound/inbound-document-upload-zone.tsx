import { useTRPC } from "@/trpc/client";
import { useToast } from "@gnd/ui/use-toast";
import { ReactNode, useEffect, useRef, useState } from "react";
import { put, PutBlobResult } from "@vercel/blob";
import { useDropzone } from "react-dropzone";
import { cn } from "@gnd/ui/cn";
import { stripSpecialCharacters } from "@gnd/utils";
import { env } from "@/env.mjs";
import { generateRandomString } from "@/lib/utils";
type Props = {
    children: ReactNode;
    onUploadComplete?: (results: PutBlobResult[]) => void;
};
export function InboundDocumentUploadZone({
    children,
    onUploadComplete,
}: Props) {
    const trpc = useTRPC();
    const [progress, setProgress] = useState(0);
    const [showProgress, setShowProgress] = useState(false);
    const [toastId, setToastId] = useState<string | undefined>(undefined);
    const { toast, dismiss, update } = useToast();
    const uploadProgress = useRef<number[]>([]);
    useEffect(() => {
        if (!toastId && showProgress) {
            const { id } = toast({
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
            update(toastId, {
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
        const path = ["inbound-documents"] as string[];
        try {
            const results = await Promise.all(
                files.map(async (file: File, idx: number) => {
                    const filename = stripSpecialCharacters(file.name);
                    const [ext, ...nameReverse] = filename
                        .split(".")
                        ?.reverse();
                    const name = nameReverse.reverse().join(".");
                    const rnd = `-uid-${generateRandomString(6)}`;
                    const fullPath = decodeURIComponent(
                        [...path, `${name}${rnd}.${ext}`].join("/"),
                    );
                    const token = env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN;
                    return put(`/${fullPath}`, file, {
                        access: "public",
                        token,
                        onUploadProgress({
                            loaded: bytesUploaded,
                            total: bytesTotal,
                            percentage,
                        }) {
                            uploadProgress.current[idx] =
                                (bytesUploaded / bytesTotal) * 100;

                            const _progress = uploadProgress.current.reduce(
                                (acc, currentValue) => {
                                    return acc + currentValue;
                                },
                                0,
                            );
                            setProgress(Math.round(_progress / files.length));
                        },
                    });
                    // return resumableUpload({
                    //     bucket: "vault",
                    //     path,
                    //     file,
                    //     onProgress: (bytesUploaded, bytesTotal) => {
                    //         uploadProgress.current[idx] =
                    //             (bytesUploaded / bytesTotal) * 100;

                    //         const _progress = uploadProgress.current.reduce(
                    //             (acc, currentValue) => {
                    //                 return acc + currentValue;
                    //             },
                    //             0,
                    //         );

                    //         setProgress(Math.round(_progress / files.length));
                    //     },
                    // }),
                }),
            ); //as UploadResult[];

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
            console.log(e);

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

            if (
                reject?.errors.find(({ code }) => code === "file-invalid-type")
            ) {
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
            "image/*": [
                ".jpg",
                ".jpeg",
                ".png",
                ".webp",
                ".heic",
                ".heif",
                ".avif",
            ],
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
                    <input
                        className=""
                        {...getInputProps()}
                        id="upload-files"
                    />
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

