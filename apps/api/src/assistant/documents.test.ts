import { describe, expect, test } from "bun:test";
import { resolveAssistantDocumentAccess } from "./documents";

const actor = {
	userId: 42,
	scopeType: "organization" as const,
	scopeId: "7",
} as never;

describe("assistant document access", () => {
	test("returns only a current private document owned by the actor conversation", async () => {
		const queries: unknown[] = [];
		const db = {
			storedDocument: {
				findFirst: async (query: unknown) => {
					queries.push(query);
					return {
						ownerId: "conversation-1",
						pathname: "users/42/assistant/invoice.pdf",
						filename: "invoice.pdf",
						mimeType: "application/pdf",
					};
				},
			},
			assistantConversation: {
				findFirst: async (query: unknown) => {
					queries.push(query);
					return { id: "conversation-1" };
				},
			},
		};
		const result = await resolveAssistantDocumentAccess(db as never, {
			actor,
			documentId: "document-1",
		});
		expect(result?.pathname).toBe("users/42/assistant/invoice.pdf");
		expect(result?.access).toBe("private");
		expect(queries).toHaveLength(2);
		expect(JSON.stringify(queries)).toContain('"ownerUserId":42');
		expect(JSON.stringify(queries)).toContain('"scopeId":"7"');
	});

	test("denies a well-formed document outside the actor scope", async () => {
		const db = {
			storedDocument: {
				findFirst: async () => ({
					ownerId: "conversation-1",
					pathname: "private.pdf",
				}),
			},
			assistantConversation: { findFirst: async () => null },
		};
		expect(
			await resolveAssistantDocumentAccess(db as never, {
				actor,
				documentId: "document-1",
			}),
		).toBe(null);
	});

	test("reauthorizes a generated Sales PDF before returning public storage", async () => {
		let documentRead = 0;
		const result = await resolveAssistantDocumentAccess(
			{
				storedDocument: {
					findFirst: async () => {
						documentRead += 1;
						return documentRead === 1
							? null
							: {
									ownerId: "101",
									pathname: "sales/101/invoice.pdf",
									url: "https://blob.example/invoice.pdf",
									filename: "Invoice 09502PC.pdf",
									mimeType: "application/pdf",
								};
					},
				},
				assistantConversation: { findFirst: async () => null },
				salesOrders: { findFirst: async () => ({ id: 101 }) },
			} as never,
			{
				actor: {
					userId: 42,
					scopeType: "organization",
					scopeId: "7",
					grants: { viewOrders: true },
				} as never,
				documentId: "sales-document-1",
			},
		);
		expect(result).toMatchObject({
			access: "public",
			ownerId: "101",
			pathname: "sales/101/invoice.pdf",
		});
	});
});
