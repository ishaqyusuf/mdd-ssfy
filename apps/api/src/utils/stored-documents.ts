import type { Db, Prisma } from "@gnd/db";
import {
	type CreateStoredDocumentFromUploadInput,
	type StoredDocumentRecord,
	type StoredDocumentRepository,
	createDocumentRegistry,
} from "@gnd/documents";

export function createStoredDocumentRepository(
	db: Db,
): StoredDocumentRepository {
	return {
		create(input) {
			return db.storedDocument.create({
				data: input as unknown as Prisma.StoredDocumentUncheckedCreateInput,
			});
		},
		update(input) {
			const { id, ...data } = input;
			return db.storedDocument.update({
				where: { id },
				data: data as unknown as Prisma.StoredDocumentUpdateInput,
			});
		},
		findCurrentByOwner(input) {
			return db.storedDocument.findFirst({
				where: {
					ownerType: input.ownerType,
					ownerId: input.ownerId,
					kind: input.kind,
					isCurrent: true,
					deletedAt: null,
				},
			});
		},
		async clearCurrentByOwner(input) {
			await db.storedDocument.updateMany({
				where: {
					ownerType: input.ownerType,
					ownerId: input.ownerId,
					kind: input.kind,
					isCurrent: true,
					deletedAt: null,
					...(input.excludeId ? { id: { not: input.excludeId } } : {}),
				},
				data: {
					isCurrent: false,
				},
			});
		},
	};
}

export function createStoredDocumentRegistry(db: Db) {
	return createDocumentRegistry(createStoredDocumentRepository(db));
}

function isRetryableStoredDocumentRegistrationError(error: unknown) {
	if (!error || typeof error !== "object") return false;
	const candidate = error as { code?: unknown; message?: unknown };
	const message =
		typeof candidate.message === "string"
			? candidate.message.toLowerCase()
			: "";
	return (
		candidate.code === "P2034" ||
		message.includes("deadlock") ||
		message.includes("serialization")
	);
}

export async function registerStoredDocumentUpload(
	db: Db,
	input: CreateStoredDocumentFromUploadInput,
	options?: {
		onRegistered?: (tx: Db, document: StoredDocumentRecord) => Promise<void>;
	},
): Promise<StoredDocumentRecord> {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		try {
			return await db.$transaction(
				async (tx) => {
					const existing = await tx.storedDocument.findFirst({
						where: {
							provider: input.upload.provider,
							pathname: input.upload.pathname,
							deletedAt: null,
						},
					});
					let registered: StoredDocumentRecord;
					if (existing) {
						if (
							existing.ownerType !== input.ownerType ||
							existing.ownerId !== input.ownerId ||
							existing.kind !== input.kind
						) {
							throw new Error(
								"Stored document path is already registered to another owner.",
							);
						}
						registered = existing as StoredDocumentRecord;
					} else {
						registered = await createStoredDocumentRegistry(
							tx as unknown as Db,
						).registerUploaded(input);
					}
					await options?.onRegistered?.(tx as unknown as Db, registered);
					return registered;
				},
				{
					isolationLevel: "Serializable",
				},
			);
		} catch (error) {
			if (attempt === 2 || !isRetryableStoredDocumentRegistrationError(error)) {
				throw error;
			}
		}
	}

	throw new Error("Stored document registration retry limit reached.");
}

export function normalizeStoredDocument(document: StoredDocumentRecord) {
	return {
		id: document.id,
		title: document.title || document.filename || "Untitled document",
		description: document.description || null,
		filename: document.filename || null,
		url: document.url || null,
		pathname: document.pathname,
		mimeType: document.mimeType || null,
		extension: document.extension || null,
		size: document.size ?? null,
		createdAt: document.createdAt ?? null,
		uploadedBy: document.uploadedBy ?? null,
		kind: document.kind,
		ownerType: document.ownerType,
		ownerId: document.ownerId,
	};
}
