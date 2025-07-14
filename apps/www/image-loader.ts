interface ImageLoaderParams {
    src: string;
    width: number;
    quality?: number;
}

export default function imageLoader({
    src,
    width,
    quality = 80,
}: ImageLoaderParams): string {
    return `https://gndprodesk.com/cdn-cgi/image/width=${width},quality=${quality}/${src}`;
}

