import type {
	CreateStoredDocumentFromUploadInput,
	CreateStoredDocumentRecordInput,
	DocumentKind,
	DocumentOwnerReference,
	StoredDocumentRecord,
	StoredDocumentRepository,
} from "./records";
import { normalizePathname } from "./utils";

function fileExtensionFromPath(pathname: string) {
	const fileName = normalizePathname(pathname).split("/").pop() || "";
	const extension = fileName.includes(".") ? fileName.split(".").pop() : null;
	return extension?.toLowerCase() || null;
}

export function createStoredDocumentRecordInput(
	input: CreateStoredDocumentFromUploadInput,
): CreateStoredDocumentRecordInput {
	return {
		ownerType: input.ownerType,
		ownerId: input.ownerId,
		ownerKey: input.ownerKey,
		kind: input.kind,
		provider: input.upload.provider,
		pathname: normalizePathname(input.upload.pathname),
		url: input.upload.url || null,
		filename: input.upload.filename || null,
		mimeType: input.upload.contentType || null,
		extension: fileExtensionFromPath(input.upload.pathname),
		size: input.upload.size ?? null,
		visibility: input.visibility || "private",
		status: "ready",
		isCurrent: input.isCurrent ?? true,
		generated: input.generated ?? false,
		sourceType: input.sourceType || null,
		sourceId: input.sourceId || null,
		uploadedBy: input.uploadedBy ?? null,
		title: input.title || null,
		description: input.description || null,
		meta: input.meta || null,
	};
}

export function buildOwnerDocumentFolder(
	input: DocumentOwnerReference & {
		kind: DocumentKind;
	},
) {
	return [
		normalizePathname(input.ownerType),
		normalizePathname(input.ownerId),
		normalizePathname(input.kind),
	]
		.filter(Boolean)
		.join("/");
}

export function createDocumentRegistry(repository: StoredDocumentRepository) {
	return {
		async registerUploaded(
			input: CreateStoredDocumentFromUploadInput,
		): Promise<StoredDocumentRecord> {
			if (input.isCurrent !== false && repository.clearCurrentByOwner) {
				await repository.clearCurrentByOwner({
					ownerType: input.ownerType,
					ownerId: input.ownerId,
					kind: input.kind,
				});
			}
			return repository.create(createStoredDocumentRecordInput(input));
		},
		async markFailed(input: {
			id: string;
			meta?: Record<string, unknown>;
		}) {
			return repository.update({
				id: input.id,
				status: "failed",
				meta: input.meta || null,
			});
		},
		async markDeleted(input: { id: string }) {
			return repository.update({
				id: input.id,
				status: "deleted",
				isCurrent: false,
				deletedAt: new Date(),
			});
		},
		findCurrentByOwner(input: {
			ownerType: DocumentOwnerReference["ownerType"];
			ownerId: string;
			kind: DocumentKind;
		}) {
			return repository.findCurrentByOwner(input);
		},
	};
}
