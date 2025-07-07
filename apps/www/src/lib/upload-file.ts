"use server";
import { getSignature } from "@/app/(v1)/_actions/cloudinary/cloudinary";
import { env } from "@/env.mjs";

export type UploadFolders = "contractor-document" | "dyke";
export async function cldUploadFiles(files, folder: UploadFolders) {
    const formData = new FormData();
    if (Array.isArray(files))
        files.map((f, i) => formData.append(`file${i + 1}`, f));
    else formData.append("file", files);
    return await uploadFile(formData, folder);
}
export async function uploadFile(formData, folder: UploadFolders) {
    const { timestamp, signature } = await getSignature(folder);

    try {
        formData.append("api_key", env.CLOUDINARY_API_KEY);
        formData.append("signature", signature);
        formData.append("timestamp", timestamp as any);
        formData.append("folder", folder);
        const endpoint = env.CLOUDINARY_UPLOAD_URL;
        console.log(Array.from(formData.values()));

        const data = await fetch(endpoint, {
            method: "POST",
            body: formData,
        }).then((res) => res.json());
        return data;
    } catch (error) {}
    return {
        error: {
            message: "Unable to upload to cloudinary. Something went wrong.",
        },
    };
}
