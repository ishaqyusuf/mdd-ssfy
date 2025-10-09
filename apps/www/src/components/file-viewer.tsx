"use client";

import { Skeleton } from "@gnd/ui/skeleton";
import dynamic from "next/dynamic";
import { FilePreviewIcon } from "@gnd/ui/file-viewer/file-preview-icon";

const DynamicImageViewer = dynamic(
    () =>
        import("@gnd/ui/file-viewer/image-viewer").then(
            (mod) => mod.ImageViewer,
        ),
    { loading: () => <Skeleton className="h-full w-full" /> },
);

const DynamicPdfViewer = dynamic(
    () => import("@gnd/ui/file-viewer/pdf-viewer").then((mod) => mod.PdfViewer),
    { loading: () => <Skeleton className="h-full w-full" /> },
);

type Props = {
    mimeType: string | null;
    url: string;
    maxWidth?: number;
};

export function FileViewer({ mimeType, url, maxWidth }: Props) {
    if (
        mimeType === "application/pdf" ||
        mimeType === "application/octet-stream"
    ) {
        console.log({ url });
        return <DynamicPdfViewer url={url} key={url} maxWidth={maxWidth} />;
    }

    if (mimeType?.startsWith("image/")) {
        return <DynamicImageViewer url={url} />;
    }

    return (
        <div className="size-16">
            <FilePreviewIcon mimetype={mimeType} />
        </div>
    );
}

