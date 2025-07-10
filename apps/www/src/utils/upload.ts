import * as tus from "tus-js-client";
import { stripSpecialCharacters } from "@gnd/utils"; // optional

type ResumableUploadParams = {
    file: File;
    bucket: string;
    path: string[];
    onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
};

export function resumableUpload({
    file,
    bucket,
    path,
    onProgress,
}: ResumableUploadParams) {
    // const uploadToVercel = api.blob.upload.useMutation(); // must be called in a React component

    const filename = stripSpecialCharacters(file.name);
    const fullPath = decodeURIComponent([...path, filename].join("/"));

    return new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
            endpoint: "/api/tus-upload", // your tus endpoint
            retryDelays: [0, 3000, 5000, 10000],
            metadata: {
                bucketName: bucket,
                objectName: fullPath,
                filename,
                filetype: file.type,
            },
            removeFingerprintOnSuccess: true,
            uploadDataDuringCreation: true,
            chunkSize: 6 * 1024 * 1024,
            onError(error) {
                reject(error);
            },
            onProgress,
            onSuccess: async () => {
                resolve({
                    ...upload,
                    filename,
                });
            },
        });

        upload.findPreviousUploads().then((previousUploads) => {
            if (previousUploads.length) {
                upload.resumeFromPreviousUpload(previousUploads[0]);
            }

            upload.start();
        });
    });
}

