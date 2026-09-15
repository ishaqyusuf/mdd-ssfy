import { AppError } from "@gnd/errors";
import { presentAssistantOutcome } from "./outcomes";

type AttachmentCorrection = "attachment-too-large" | "attachment-unreadable" | "attachment-unsupported" | "image-unsupported";

export class AssistantAttachmentInputError extends AppError {
	constructor(readonly outcomeKind: AttachmentCorrection, cause?: unknown) {
		super({ code: "VALIDATION_FAILED", publicMessage: presentAssistantOutcome({ kind: outcomeKind }).message, cause });
	}
}

/** Map known decoder input failures; unexpected decoder/service errors remain failures. */
export async function withAssistantAttachmentCorrection<T>(kind: "pdf" | "image", operation: () => Promise<T>): Promise<T> {
	try { return await operation(); }
	catch (error) {
		if (!(error instanceof Error)) throw error;
		if (kind === "pdf" && ["InvalidPDFException", "PasswordException"].includes(error.name))
			throw new AssistantAttachmentInputError("attachment-unreadable", error);
		if (kind === "image") {
			if (error.message === "Input image exceeds pixel limit") throw new AssistantAttachmentInputError("attachment-too-large", error);
			if (error.message === "Input buffer contains unsupported image format" || error.message.startsWith("Input buffer has corrupt header:"))
				throw new AssistantAttachmentInputError("attachment-unreadable", error);
		}
		throw error;
	}
}
