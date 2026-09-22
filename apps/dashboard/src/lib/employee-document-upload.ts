export const employeeDocumentMimeTypes = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/avif",
	"image/heic",
	"image/heif",
	"application/pdf",
] as const;

export type EmployeeDocumentMimeType =
	(typeof employeeDocumentMimeTypes)[number];

export function resolveEmployeeDocumentMimeType(
	file: File,
): EmployeeDocumentMimeType | null {
	if (
		employeeDocumentMimeTypes.includes(file.type as EmployeeDocumentMimeType)
	) {
		return file.type as EmployeeDocumentMimeType;
	}
	const extension = file.name.split(".").pop()?.toLowerCase();
	const byExtension: Record<string, EmployeeDocumentMimeType> = {
		png: "image/png",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		webp: "image/webp",
		avif: "image/avif",
		heic: "image/heic",
		heif: "image/heif",
		pdf: "application/pdf",
	};
	return extension ? (byExtension[extension] ?? null) : null;
}

export function validateEmployeeDocumentFile(file: File) {
	if (!resolveEmployeeDocumentMimeType(file)) {
		return "Choose a PDF, JPEG, PNG, WebP, AVIF, HEIC, or HEIF file.";
	}
	if (!file.size || file.size > 8_000_000) {
		return "Document files must be smaller than 8 MB.";
	}
	return null;
}

export function readEmployeeDocumentAsBase64(file: File) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () =>
			reject(reader.error || new Error("File read failed."));
		reader.onload = () => {
			const value = typeof reader.result === "string" ? reader.result : "";
			const separator = value.indexOf(",");
			if (separator < 0) {
				reject(new Error("File encoding failed."));
				return;
			}
			resolve(value.slice(separator + 1));
		};
		reader.readAsDataURL(file);
	});
}
