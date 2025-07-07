"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { env } from "@/env.mjs";
import { uploadFile, UploadFolders } from "@/lib/upload-file";
import { Cloud, Upload, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

import { Icons } from "../_v1/icons";
import { Label } from "@gnd/ui/label";

interface Props {
    src?: string | null;
    label?: string;
    accept?: string;
    folder: UploadFolders;
    onUpload?(assetId?);
    width?: number;
    height?: number;
    alt?: string;
    children?;
}
export function FileUploader({
    src,
    label,
    onUpload,
    folder,
    width = 100,
    height = 100,
    alt,
    accept = "image/*",
    children,
}: Props) {
    const [assetId, setAssetId] = useState(src);
    const [url, setUrl] = useState("");
    const fileInputRef = useRef(null);
    const [loading, startTransition] = useTransition();
    const isImg = accept.startsWith("image");

    const handleFileUpload = async (mode: "url" | "file" = "file") => {
        // 'use server'
        startTransition(async () => {
            const isUrl = mode == "url";
            const fileInput = fileInputRef.current as any;
            const file = isUrl ? url : fileInput?.files?.[0];

            if (file) {
                // console.log("UPLOADING....");

                const formData = new FormData();
                formData.append("file", file);

                const data = await uploadFile(formData, folder);

                if (data.error) {
                    toast.error(data.error.message);
                } else {
                    const resp = {
                        url: data.public_id,
                        pathName: data.secure_url?.split("/").slice(-1)[0],
                        // assetId: data.asset_id,
                    };
                    console.log(resp);
                    onUpload && onUpload(resp.pathName);
                    setAssetId(resp.pathName);
                }
            }
        });
    };
    return (
        <div className="grid gap-4">
            {label && <Label>{label}</Label>}
            <div className="flex flex-col items-center justify-center space-y-4">
                {!assetId && onUpload ? (
                    <div className="flex w-full max-w-md flex-col items-center justify-center space-y-2 rounded-lg border-2 border-dashed border-gray-400 p-6">
                        <Cloud className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                        <p className="text-gray-500 dark:text-gray-400">
                            Drag and drop your files here
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            or
                        </p>
                    </div>
                ) : (
                    <>
                        {children
                            ? children
                            : isImg &&
                              assetId && (
                                  <Image
                                      className=""
                                      width={width}
                                      height={height}
                                      src={`${env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${folder}/${assetId}`}
                                      alt={alt as any}
                                  />
                              )}
                    </>
                )}
                {onUpload && (
                    <>
                        <div className="flex w-full max-w-md items-center justify-center">
                            <label
                                className="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-900 px-4 py-1 text-white hover:bg-gray-800 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-100"
                                htmlFor="file-upload"
                            >
                                <UploadIcon className="h-5 w-5" />
                                <span>Browse files</span>
                                <input
                                    disabled={loading}
                                    className="sr-only"
                                    id="file-upload"
                                    ref={fileInputRef}
                                    accept={accept}
                                    type="file"
                                    onChange={() => handleFileUpload()}
                                />
                            </label>
                            {/* <input
                                accept={accept}
                                type="file"
                                disabled={loading}
                                ref={fileInputRef}
                                className="w-full p-2 sr-only"
                                onChange={() => handleFileUpload()}
                            /> */}
                        </div>
                        <div className="grid w-full gap-4">
                            <Label>Upload Url</Label>
                            <div className="flex space-x-2">
                                <Input
                                    className="h-8"
                                    placeholder="Paste upload url here..."
                                    defaultValue={url}
                                    onChange={(e) => {
                                        setUrl(e.target.value);
                                    }}
                                />
                                <Button
                                    disabled={loading}
                                    onClick={() => {
                                        handleFileUpload("url");
                                    }}
                                    size="icon"
                                    className="h-8 w-8"
                                >
                                    <Upload className="size-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
