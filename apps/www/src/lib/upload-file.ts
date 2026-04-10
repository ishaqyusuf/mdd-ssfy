"use server";

import { getSignature } from "@/app-deps/(v1)/_actions/cloudinary/cloudinary";
import { env } from "@/env.mjs";

export type UploadFolders = "contractor-document" | "dyke" | "app-download";
type UploadResourceType = "auto" | "raw";

function resolveCloudinaryEndpoint(resourceType: UploadResourceType) {
    if (resourceType !== "raw") return env.CLOUDINARY_UPLOAD_URL;

    return env.CLOUDINARY_UPLOAD_URL.replace("/image/upload", "/raw/upload");
}
async function cldUploadFiles(files, folder: UploadFolders) {
    const formData = new FormData();
    if (Array.isArray(files))
        files.map((f, i) => formData.append(`file${i + 1}`, f));
    else formData.append("file", files);
    return await uploadFile(formData, folder);
}
export async function uploadFile(
    formData,
    folder: UploadFolders,
    options?: {
        resourceType?: UploadResourceType;
    },
) {
    const { timestamp, signature } = await getSignature(folder);
    const resourceType = options?.resourceType || "auto";

    try {
        formData.append("api_key", env.CLOUDINARY_API_KEY);
        formData.append("signature", signature);
        formData.append("timestamp", timestamp as any);
        formData.append("folder", folder);
        const endpoint = resolveCloudinaryEndpoint(resourceType);

        const response = await fetch(endpoint, {
            method: "POST",
            body: formData,
        });
        const data = await response.json();

        if (!response.ok || data?.error) {
            return {
                error: {
                    message:
                        data?.error?.message ||
                        data?.message ||
                        "Unable to upload to cloudinary. Something went wrong.",
                },
            };
        }
        return data;
    } catch (error) {}
    return {
        error: {
            message: "Unable to upload to cloudinary. Something went wrong.",
        },
    };
}
