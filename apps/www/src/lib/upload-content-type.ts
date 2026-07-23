export type SupportedUploadContentType =
	| "application/pdf"
	| "image/avif"
	| "image/heic"
	| "image/heif"
	| "image/jpeg"
	| "image/png"
	| "image/webp";

const uploadMimeTypes = new Set<SupportedUploadContentType>([
	"application/pdf",
	"image/avif",
	"image/heic",
	"image/heif",
	"image/jpeg",
	"image/png",
	"image/webp",
]);

export function resolveUploadContentType(input: {
	name: string;
	type?: string | null;
}): SupportedUploadContentType {
	if (uploadMimeTypes.has(input.type as SupportedUploadContentType)) {
		return input.type as SupportedUploadContentType;
	}
	const extension = input.name.split(".").pop()?.toLowerCase();
	switch (extension) {
		case "pdf":
			return "application/pdf";
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
			throw new Error("Unsupported file type.");
	}
}
