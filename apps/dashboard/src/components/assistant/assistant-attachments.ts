export const ASSISTANT_ATTACHMENT_MAX_FILES = 5;
export const ASSISTANT_ATTACHMENT_MAX_BYTES = 8_000_000;
export const ASSISTANT_ATTACHMENT_MAX_TOTAL_BYTES = 16_000_000;
export const ASSISTANT_PDF_MAX_PAGES = 50;
export const assistantAttachmentMimeTypes = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/avif",
	"image/heic",
	"image/heif",
	"application/pdf",
] as const;

export type AssistantAttachmentMimeType =
	(typeof assistantAttachmentMimeTypes)[number];

export type AssistantAttachment = {
	id: string;
	name: string;
	mimeType: AssistantAttachmentMimeType;
	size: number;
	pathname: string;
	previewUrl: string;
};

export async function validateAssistantAttachment(file: File) {
	if (
		!assistantAttachmentMimeTypes.includes(
			file.type as AssistantAttachmentMimeType,
		)
	) {
		throw new Error(`${file.name} is not a supported image or PDF.`);
	}
	if (!file.size || file.size > ASSISTANT_ATTACHMENT_MAX_BYTES) {
		throw new Error(`${file.name} must be smaller than 8 MB.`);
	}
}

export function validateAssistantAttachmentTotal(
	existing: Array<{ size: number }>,
	incoming: Array<{ size: number }>,
) {
	const total = [...existing, ...incoming].reduce(
		(bytes, file) => bytes + file.size,
		0,
	);
	if (total > ASSISTANT_ATTACHMENT_MAX_TOTAL_BYTES) {
		throw new Error("Attachments can total up to 16 MB per message.");
	}
}

export function readAssistantAttachment(file: File) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () =>
			reject(reader.error ?? new Error("File read failed."));
		reader.onload = () => {
			const value = typeof reader.result === "string" ? reader.result : "";
			const separator = value.indexOf(",");
			if (separator < 0) reject(new Error("File encoding failed."));
			else resolve(value.slice(separator + 1));
		};
		reader.readAsDataURL(file);
	});
}

export function assistantAttachmentParts(attachments: AssistantAttachment[]) {
	return attachments.map((attachment) => ({
		type: "file" as const,
		mediaType: attachment.mimeType,
		filename: attachment.name,
		url: attachment.id,
	}));
}
