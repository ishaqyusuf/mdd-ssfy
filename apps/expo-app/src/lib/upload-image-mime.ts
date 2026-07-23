export type UploadImageMimeType =
	| "image/png"
	| "image/jpeg"
	| "image/webp"
	| "image/avif"
	| "image/heic"
	| "image/heif";

export function resolveUploadImageMimeType(
	value?: string | null,
	filename?: string | null,
): UploadImageMimeType | null {
	switch (value) {
		case "image/png":
		case "image/jpeg":
		case "image/webp":
		case "image/avif":
		case "image/heic":
		case "image/heif":
			return value;
	}
	const extension = filename?.split(".").pop()?.toLowerCase();
	switch (extension) {
		case "avif":
			return "image/avif";
		case "heic":
			return "image/heic";
		case "heif":
			return "image/heif";
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		case "png":
			return "image/png";
		case "webp":
			return "image/webp";
		default:
			return null;
	}
}
