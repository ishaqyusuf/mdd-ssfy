import { describe, expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import { registerStoredDocumentUpload } from "./stored-documents";

const existingDocument = {
	id: "doc-1",
	kind: "dispatch_image",
	ownerType: "dispatch",
	ownerId: "42",
	ownerKey: "photo-1",
	provider: "vercel-blob",
	pathname: "dispatch/42/photo.jpg",
	url: "https://blob/photo.jpg",
	filename: "photo.jpg",
	mimeType: "image/jpeg",
	extension: "jpg",
	size: 120,
	checksum: null,
	visibility: "private",
	status: "ready",
	isCurrent: false,
	generated: false,
	sourceType: null,
	sourceId: null,
	uploadedBy: 7,
	title: null,
	description: null,
	meta: null,
	createdAt: new Date("2026-07-23T00:00:00.000Z"),
	updatedAt: new Date("2026-07-23T00:00:00.000Z"),
	deletedAt: null,
};

function input() {
	return {
		ownerType: "dispatch" as const,
		ownerId: "42",
		ownerKey: "photo-1",
		kind: "dispatch_image" as const,
		upload: {
			provider: "vercel-blob" as const,
			pathname: "dispatch/42/photo.jpg",
			url: "https://blob/photo.jpg",
			filename: "photo.jpg",
			contentType: "image/jpeg",
			size: 120,
		},
		isCurrent: false,
		uploadedBy: 7,
	};
}

function transactionalDb(storedDocument: Record<string, unknown>) {
	const db = {
		storedDocument,
		$transaction: async (callback: (tx: unknown) => unknown) => callback(db),
	};
	return db as unknown as Db;
}

describe("registerStoredDocumentUpload", () => {
	test("reuses a matching provider/path registration", async () => {
		let creates = 0;
		const db = transactionalDb({
			findFirst: async () => existingDocument,
			create: async () => {
				creates += 1;
				return existingDocument;
			},
		});

		const result = await registerStoredDocumentUpload(db, input());

		expect(result.id).toBe("doc-1");
		expect(creates).toBe(0);
	});

	test("rejects a provider/path already owned by another record", async () => {
		const db = transactionalDb({
			findFirst: async () => ({
				...existingDocument,
				ownerId: "99",
			}),
		});

		expect(registerStoredDocumentUpload(db, input())).rejects.toThrow(
			"another owner",
		);
	});

	test("registers a new upload through the shared registry", async () => {
		let createdInput: unknown;
		const db = transactionalDb({
			findFirst: async () => null,
			create: async ({ data }: { data: unknown }) => {
				createdInput = data;
				return existingDocument;
			},
		});

		await registerStoredDocumentUpload(db, input());

		expect(createdInput).toMatchObject({
			ownerType: "dispatch",
			ownerId: "42",
			kind: "dispatch_image",
			pathname: "dispatch/42/photo.jpg",
			status: "ready",
			isCurrent: false,
		});
	});

	test("retries a serializable registration conflict and reuses the winner", async () => {
		let attempts = 0;
		const db = {
			storedDocument: {},
			$transaction: async (callback: (tx: unknown) => unknown) => {
				attempts += 1;
				if (attempts === 1) {
					throw Object.assign(new Error("Transaction write conflict"), {
						code: "P2034",
					});
				}
				return callback({
					storedDocument: {
						findFirst: async () => existingDocument,
					},
				});
			},
		} as unknown as Db;

		const result = await registerStoredDocumentUpload(db, input());

		expect(result.id).toBe(existingDocument.id);
		expect(attempts).toBe(2);
	});

	test("runs a workflow checkpoint inside the registration transaction", async () => {
		let checkpointedId: string | undefined;
		const db = transactionalDb({
			findFirst: async () => existingDocument,
		});

		await registerStoredDocumentUpload(db, input(), {
			onRegistered: async (_tx, document) => {
				checkpointedId = document.id;
			},
		});

		expect(checkpointedId).toBe(existingDocument.id);
	});
});
