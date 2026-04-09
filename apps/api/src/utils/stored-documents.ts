import {
  createDocumentRegistry,
  type StoredDocumentRecord,
  type StoredDocumentRepository,
} from "@gnd/documents";
import type { Db } from "@gnd/db";

function createStoredDocumentRepository(
  db: Db,
): StoredDocumentRepository {
  return {
    create(input) {
      return db.storedDocument.create({
        data: input,
      });
    },
    update(input) {
      const { id, ...data } = input;
      return db.storedDocument.update({
        where: { id },
        data,
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
