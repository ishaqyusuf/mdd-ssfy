import sharp from "sharp";

export type SalesRequestImage = {
	bytes: Uint8Array;
	mediaType: "image/jpeg" | "image/png" | "image/webp";
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;
const formatByMediaType = {
	"image/jpeg": "jpeg",
	"image/png": "png",
	"image/webp": "webp",
} as const;

/** Request-scoped bytes only: never fetch arbitrary URLs or publish customer images. */
export async function prepareSalesRequestImages(
	images: readonly SalesRequestImage[],
): Promise<SalesRequestImage[]> {
	if (images.length > 3)
		throw new Error("At most three request images are allowed");
	let total = 0;
	for (const image of images) {
		if (!image.bytes.byteLength || image.bytes.byteLength > MAX_IMAGE_BYTES) {
			throw new Error("Request images must be nonempty and at most 5 MiB each");
		}
		total += image.bytes.byteLength;
	}
	if (total > MAX_TOTAL_BYTES)
		throw new Error("Request images exceed the 10 MiB total limit");

	const prepared: SalesRequestImage[] = [];
	// Sequential decoding bounds peak memory for multiple high-resolution photos.
	for (const image of images) {
		const decoder = sharp(image.bytes, {
			limitInputPixels: MAX_PIXELS,
			failOn: "warning",
		});
		const metadata = await decoder.metadata();
		const format = formatByMediaType[image.mediaType];
		if (!format || metadata.format !== format)
			throw new Error("Request image format does not match its media type");
		if (
			!metadata.width ||
			!metadata.height ||
			metadata.width * metadata.height > MAX_PIXELS
		) {
			throw new Error("Request image exceeds the pixel limit");
		}
		if ((metadata.pages ?? 1) !== 1)
			throw new Error("Animated or multi-page request images are unsupported");
		// Decode fully, apply orientation, and strip EXIF and other metadata by default.
		const bytes = await decoder.autoOrient().toFormat(format).toBuffer();
		if (bytes.byteLength > MAX_IMAGE_BYTES)
			throw new Error("Normalized request image exceeds 5 MiB");
		prepared.push({ bytes, mediaType: image.mediaType });
	}
	if (
		prepared.reduce((sum, image) => sum + image.bytes.byteLength, 0) >
		MAX_TOTAL_BYTES
	) {
		throw new Error("Normalized request images exceed the 10 MiB total limit");
	}
	return prepared;
}
