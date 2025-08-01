import { env } from "@/env.mjs";
import Image from "next/image";
import ConfirmBtn from "./confirm-button";
import { del, PutBlobResult } from "@vercel/blob";
import { FileUpload } from "./file-upload";
import { Label } from "@gnd/ui/label";
import { Camera } from "lucide-react";
import { BlobPath } from "@gnd/utils/constants";
interface Props {
    attachments: { pathname }[];
    onDelete?: (data, index) => void;
    handleDelete?: (data, index) => void;
    onAttached?: (result: PutBlobResult[]) => void;
    path?: BlobPath; //"dispatch-documents" | "dispatch-invoice";
}
export function AttachmentGallery(props: Props) {
    return (
        <div className="flex gap-4">
            {props.attachments.map((a, ai) => (
                <div key={ai}>
                    <Image
                        src={`${env.NEXT_PUBLIC_VERCEL_BLOB_URL}/${a.pathname}`}
                        alt={a.pathname}
                        width={75}
                        height={75}
                    />
                    {!props.onDelete || (
                        <div className="flex gap-4">
                            <ConfirmBtn
                                trash
                                onClick={(e) => {
                                    if (!props.handleDelete && props.onDelete) {
                                        del(a.pathname).then((e) => {
                                            props.onDelete?.(a.pathname, ai);
                                        });
                                    }
                                }}
                                type="button"
                            />
                        </div>
                    )}
                </div>
            ))}
            {!props.path || (
                <FileUpload
                    label="Attach Photo (Optional)"
                    path={props.path}
                    onUploadComplete={(e) => {
                        props?.onAttached(e);
                    }}
                >
                    <Label
                        onClick={() =>
                            document.getElementById("upload-files")?.click()
                        }
                        className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                        <Camera className="size-4" />
                        <span>Take Photo</span>
                    </Label>
                </FileUpload>
            )}
        </div>
    );
}

