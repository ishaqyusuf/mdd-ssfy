import { describe, expect, test } from "bun:test";
import { adoptStoredDocumentAttachments } from "@gnd/utils/note";

describe("adoptStoredDocumentAttachments", () => {
	test("allows unregistered legacy or durable ready paths", async () => {
		await expect(
			adoptStoredDocumentAttachments(
				{
					storedDocument: {
						findMany: async () => [],
					},
				},
				{
					pathnames: ["legacy/path.jpg", "durable/path.jpg"],
					uploadedBy: 42,
					ownerType: "note",
					ownerId: "10",
					sourceType: "note_attachment",
					sourceId: "10",
				},
			),
		).resolves.toEqual({ adopted: 0 });
	});

	test("rejects when a canonical candidate cannot be acquired", async () => {
		await expect(
			adoptStoredDocumentAttachments(
				{
					storedDocument: {
						findMany: async () => [{ id: "doc-deleting" }],
						updateMany: async () => ({ count: 0 }),
					},
				},
				{
					pathnames: ["inbound-documents/photo.jpg"],
					uploadedBy: 42,
					ownerType: "note",
					ownerId: "10",
					sourceType: "note_attachment",
					sourceId: "10",
				},
			),
		).rejects.toThrow("being deleted");
	});
});
