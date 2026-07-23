import { createHash } from "node:crypto";
import type { Prisma } from "@gnd/db";
import { z } from "zod";

export const dispatchProofMimeTypes = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/avif",
	"image/heic",
	"image/heif",
] as const;

const requestIdSchema = z
	.string()
	.min(12)
	.max(100)
	.regex(
		/^[A-Za-z0-9._:-]+$/,
		"Completion request id contains unsupported characters.",
	);

const attachmentSchema = z.object({
	clientId: z
		.string()
		.min(1)
		.max(80)
		.regex(/^[A-Za-z0-9._-]+$/),
	fileName: z.string().min(1).max(180),
	contentType: z.enum(dispatchProofMimeTypes).default("image/jpeg"),
	base64: z
		.string()
		.min(1)
		.max(8_000_000)
		.regex(/^[A-Za-z0-9+/]*={0,2}$/, "Attachment content is not valid base64."),
});

export const completeDispatchWithProofSchema = z
	.object({
		dispatchId: z.number().int().positive(),
		requestId: requestIdSchema,
		receivedBy: z.string().trim().max(200).optional(),
		receivedDate: z.coerce.date().optional(),
		note: z.string().max(5_000).optional(),
		noteType: z.enum(["dispatch", "pickup"]).optional(),
		signaturePath: z
			.string()
			.trim()
			.min(1)
			.max(50_000)
			.regex(
				/^[ML0-9., \-]+$/,
				"Signature path contains unsupported characters.",
			),
		attachments: z.array(attachmentSchema).max(5).default([]),
	})
	.superRefine((value, ctx) => {
		const clientIds = new Set<string>();
		for (const [index, attachment] of value.attachments.entries()) {
			if (clientIds.has(attachment.clientId)) {
				ctx.addIssue({
					code: "custom",
					path: ["attachments", index, "clientId"],
					message: "Attachment client ids must be unique.",
				});
			}
			clientIds.add(attachment.clientId);
		}
	});

export type CompleteDispatchWithProofInput = z.infer<
	typeof completeDispatchWithProofSchema
>;

export type DispatchCompletionProof = {
	requestId: string;
	payloadFingerprint?: string;
	status: "uploading" | "completed";
	signaturePathname?: string;
	signatureDocumentId?: string;
	attachments: Array<{
		clientId: string;
		pathname: string;
		documentId?: string;
	}>;
	startedAt: string;
	completedAt?: string;
};

export const DISPATCH_COMPLETION_PROOF_LEASE_MS = 15 * 60 * 1000;
export const PACKING_RESIGN_WINDOW_MS = 5 * 60 * 1000;

export function canResignPackingSlip(
	input: {
		status: string | null | undefined;
		deliveredAt: Date | null | undefined;
	},
	now = new Date(),
) {
	const elapsed = input.deliveredAt
		? now.getTime() - input.deliveredAt.getTime()
		: Number.NaN;
	return (
		input.status === "completed" &&
		Number.isFinite(elapsed) &&
		elapsed >= 0 &&
		elapsed <= PACKING_RESIGN_WINDOW_MS
	);
}

export function isDispatchCompletionProofStale(
	completion: DispatchCompletionProof,
	now = new Date(),
) {
	const startedAt = new Date(completion.startedAt).getTime();
	return (
		!Number.isFinite(startedAt) ||
		now.getTime() - startedAt >= DISPATCH_COMPLETION_PROOF_LEASE_MS
	);
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function getDispatchCompletionProof(
	meta: unknown,
): DispatchCompletionProof | null {
	const completion = asRecord(asRecord(meta).dispatchCompletion);
	const requestId =
		typeof completion.requestId === "string" ? completion.requestId : "";
	const status =
		completion.status === "uploading" || completion.status === "completed"
			? completion.status
			: null;
	if (!requestId || !status) return null;

	const attachments = Array.isArray(completion.attachments)
		? completion.attachments.flatMap((value) => {
				const attachment = asRecord(value);
				const clientId =
					typeof attachment.clientId === "string" ? attachment.clientId : "";
				const pathname =
					typeof attachment.pathname === "string" ? attachment.pathname : "";
				const documentId =
					typeof attachment.documentId === "string"
						? attachment.documentId
						: undefined;
				return clientId && pathname
					? [{ clientId, pathname, ...(documentId ? { documentId } : {}) }]
					: [];
			})
		: [];

	return {
		requestId,
		status,
		attachments,
		startedAt:
			typeof completion.startedAt === "string"
				? completion.startedAt
				: new Date(0).toISOString(),
		...(typeof completion.signaturePathname === "string"
			? { signaturePathname: completion.signaturePathname }
			: {}),
		...(typeof completion.signatureDocumentId === "string"
			? { signatureDocumentId: completion.signatureDocumentId }
			: {}),
		...(typeof completion.completedAt === "string"
			? { completedAt: completion.completedAt }
			: {}),
		...(typeof completion.payloadFingerprint === "string"
			? { payloadFingerprint: completion.payloadFingerprint }
			: {}),
	};
}

export function mergeDispatchCompletionProof(
	meta: unknown,
	completion: DispatchCompletionProof,
): Prisma.InputJsonValue {
	return JSON.parse(
		JSON.stringify({
			...asRecord(meta),
			dispatchCompletion: completion,
		}),
	) as Prisma.InputJsonValue;
}

export function createDispatchCompletionProof(
	meta: unknown,
	requestId: string,
	now = new Date(),
	payloadFingerprint?: string,
): DispatchCompletionProof {
	const existing = getDispatchCompletionProof(meta);
	if (existing?.requestId === requestId) {
		if (
			!existing.payloadFingerprint &&
			(existing.signaturePathname ||
				existing.signatureDocumentId ||
				existing.attachments.length)
		) {
			throw new Error(
				"Existing proof checkpoints predate content fingerprinting; start a new completion request.",
			);
		}
		assertDispatchCompletionPayloadFingerprint(existing, payloadFingerprint);
		return existing.payloadFingerprint || !payloadFingerprint
			? existing
			: { ...existing, payloadFingerprint };
	}
	return {
		requestId,
		...(payloadFingerprint ? { payloadFingerprint } : {}),
		status: "uploading",
		attachments: [],
		startedAt: now.toISOString(),
	};
}

export function getDispatchCompletionPayloadFingerprint(
	input: Pick<CompleteDispatchWithProofInput, "signaturePath" | "attachments">,
) {
	const hash = createHash("sha256");
	hash.update(input.signaturePath);
	for (const attachment of [...input.attachments].sort((a, b) =>
		a.clientId.localeCompare(b.clientId),
	)) {
		hash.update("\0");
		hash.update(attachment.clientId);
		hash.update("\0");
		hash.update(attachment.contentType);
		hash.update("\0");
		hash.update(attachment.base64);
	}
	return hash.digest("hex");
}

export function assertDispatchCompletionPayloadFingerprint(
	completion: DispatchCompletionProof,
	payloadFingerprint?: string,
) {
	if (
		completion.payloadFingerprint &&
		payloadFingerprint &&
		completion.payloadFingerprint !== payloadFingerprint
	) {
		throw new Error(
			"Completion request id was already used for different proof content.",
		);
	}
}

export function buildDispatchSignatureSvg(path: string) {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160"><path d="${path}" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
}

export function decodePngSignatureDataUrl(value: string) {
	const match = /^data:image\/png;base64,([A-Za-z0-9+/]*={0,2})$/.exec(value);
	if (!match?.[1]) {
		throw new Error("Signature must be a valid PNG data URL.");
	}
	const buffer = Buffer.from(match[1], "base64");
	if (!buffer.length || buffer.length > 4_000_000) {
		throw new Error("Signature PNG must be between 1 byte and 4 MB.");
	}
	if (
		buffer.length < 8 ||
		![137, 80, 78, 71, 13, 10, 26, 10].every(
			(byte, index) => buffer[index] === byte,
		)
	) {
		throw new Error("Signature must contain a PNG image.");
	}
	return buffer;
}

export function getDispatchProofFilename(
	requestId: string,
	kind: "signature" | "attachment",
	clientId?: string,
) {
	const safeRequestId = requestId.replace(/[^A-Za-z0-9._-]/g, "-");
	return kind === "signature"
		? `${safeRequestId}-signature.svg`
		: `${safeRequestId}-${clientId || "attachment"}`;
}
