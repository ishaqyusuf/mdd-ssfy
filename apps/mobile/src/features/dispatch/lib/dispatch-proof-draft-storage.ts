import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import type { UploadImageMimeType } from "@/lib/upload-image-mime";

export const PROOF_DRAFT_VERSION = 2;
export const PROOF_MAX_FILES = 5;
export const PROOF_MAX_FILE_BYTES = 4_000_000;
export const PROOF_MAX_TOTAL_BYTES = 10_000_000;
const PROOF_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

export type DispatchProofDraftAttachment = {
	clientId: string;
	fileName: string;
	contentType: UploadImageMimeType;
	uri: string;
	byteSize: number;
	contentFingerprint?: string;
};

export type DispatchProofDraft = {
	version: typeof PROOF_DRAFT_VERSION;
	dispatchId: number;
	userId: number;
	requestId: string;
	manifestRevision: string;
	receivedBy: string;
	note: string;
	signaturePath: string;
	attachments: DispatchProofDraftAttachment[];
	createdAt: string;
	updatedAt: string;
	attemptState: "draft" | "submitting" | "retryable_failure";
};

function draftKey(userId: number, dispatchId: number) {
	return `dispatch-proof-draft-v2:${userId}:${dispatchId}`;
}

function draftDirectory(userId: number, dispatchId: number) {
	return `${FileSystem.documentDirectory}dispatch-proof-drafts/${userId}/${dispatchId}/`;
}

export function createDispatchProofDraft(
	userId: number,
	dispatchId: number,
	receivedBy = "",
	manifestRevision = "",
): DispatchProofDraft {
	const now = new Date().toISOString();
	return {
		version: PROOF_DRAFT_VERSION,
		userId,
		dispatchId,
		requestId: `dispatch:${Date.now()}:${Math.random().toString(36).slice(2, 12)}`,
		manifestRevision,
		receivedBy,
		note: "",
		signaturePath: "",
		attachments: [],
		createdAt: now,
		updatedAt: now,
		attemptState: "draft",
	};
}

function validDraft(
	value: unknown,
	userId: number,
	dispatchId: number,
): value is DispatchProofDraft {
	if (!value || typeof value !== "object") return false;
	const draft = value as Partial<DispatchProofDraft>;
	return (
		draft.version === PROOF_DRAFT_VERSION &&
		draft.userId === userId &&
		draft.dispatchId === dispatchId &&
		typeof draft.requestId === "string" &&
		typeof draft.manifestRevision === "string" &&
		typeof draft.updatedAt === "string" &&
		Array.isArray(draft.attachments)
	);
}

export async function loadDispatchProofDraft(
	userId: number,
	dispatchId: number,
) {
	const raw = await AsyncStorage.getItem(draftKey(userId, dispatchId));
	if (!raw) return null;
	try {
		const value: unknown = JSON.parse(raw);
		if (!validDraft(value, userId, dispatchId)) {
			await clearDispatchProofDraft(userId, dispatchId);
			return null;
		}
		const updatedAt = new Date(value.updatedAt).getTime();
		if (
			!Number.isFinite(updatedAt) ||
			Date.now() - updatedAt > PROOF_DRAFT_MAX_AGE_MS
		) {
			await clearDispatchProofDraft(userId, dispatchId);
			return null;
		}
		const attachments: DispatchProofDraftAttachment[] = [];
		for (const attachment of value.attachments) {
			const info = await FileSystem.getInfoAsync(attachment.uri);
			if (
				info.exists &&
				typeof info.size === "number" &&
				info.size <= PROOF_MAX_FILE_BYTES
			) {
				attachments.push({ ...attachment, byteSize: info.size });
			}
		}
		return { ...value, attachments };
	} catch {
		await clearDispatchProofDraft(userId, dispatchId);
		return null;
	}
}

export async function saveDispatchProofDraft(draft: DispatchProofDraft) {
	await AsyncStorage.setItem(
		draftKey(draft.userId, draft.dispatchId),
		JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
	);
}

export async function stageDispatchProofAttachment(input: {
	userId: number;
	dispatchId: number;
	clientId: string;
	fileName: string;
	contentType: UploadImageMimeType;
	sourceUri: string;
}) {
	const info = await FileSystem.getInfoAsync(input.sourceUri, { md5: true });
	if (!info.exists || typeof info.size !== "number") {
		throw new Error("The selected photo is no longer available.");
	}
	if (info.size > PROOF_MAX_FILE_BYTES) {
		throw new Error("Each proof photo must be smaller than 4 MB.");
	}
	const directory = draftDirectory(input.userId, input.dispatchId);
	await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
	const extension =
		input.fileName
			.split(".")
			.pop()
			?.replace(/[^A-Za-z0-9]/g, "") || "jpg";
	const destination = `${directory}${input.clientId}.${extension}`;
	await FileSystem.copyAsync({ from: input.sourceUri, to: destination });
	return {
		clientId: input.clientId,
		fileName: input.fileName,
		contentType: input.contentType,
		uri: destination,
		byteSize: info.size,
		...(typeof info.md5 === "string" ? { contentFingerprint: info.md5 } : {}),
	} satisfies DispatchProofDraftAttachment;
}

export async function readDispatchProofAttachment(
	attachment: DispatchProofDraftAttachment,
) {
	const info = await FileSystem.getInfoAsync(attachment.uri, { md5: true });
	if (!info.exists || typeof info.size !== "number") {
		throw new Error(`${attachment.fileName} is no longer available.`);
	}
	if (info.size > PROOF_MAX_FILE_BYTES) {
		throw new Error(`${attachment.fileName} is larger than 4 MB.`);
	}
	if (
		attachment.contentFingerprint &&
		typeof info.md5 === "string" &&
		attachment.contentFingerprint !== info.md5
	) {
		throw new Error(`${attachment.fileName} changed after it was selected.`);
	}
	return FileSystem.readAsStringAsync(attachment.uri, {
		encoding: FileSystem.EncodingType.Base64,
	});
}

export async function deleteDispatchProofAttachment(uri: string) {
	await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function clearDispatchProofDraft(
	userId: number,
	dispatchId: number,
) {
	await AsyncStorage.removeItem(draftKey(userId, dispatchId));
	try {
		await FileSystem.deleteAsync(draftDirectory(userId, dispatchId), {
			idempotent: true,
		});
	} catch (error) {
		console.warn("Unable to clean dispatch proof files.", error);
	}
}
