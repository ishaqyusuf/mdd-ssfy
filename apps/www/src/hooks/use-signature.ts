import { env } from "@/env.mjs";
import { BlobPath } from "@gnd/utils/constants";
import { put } from "@vercel/blob";

interface Props {
    id: string;
    title: string;
}
export function useSignature({ id }: Props) {
    const saveSignature = async (path: BlobPath, title) => {
        const canvas = document.getElementById(id) as HTMLCanvasElement;
        if (canvas) {
            const token = env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN;
            const dataURL = canvas.toDataURL();
            //    onSignatureChange(dataURL);
            const blobData = await fetch(dataURL).then((res) => res.blob());
            console.log(blobData);
            const result = await put(
                [path, `${title}-${Date.now()}.png`].join("/"),
                blobData,
                {
                    access: "public",
                    token,
                },
            );
            return result?.pathname;
        }
        return null;
    };
    return {
        id,
        saveSignature,
    };
}

