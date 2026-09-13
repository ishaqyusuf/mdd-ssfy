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
									sourceId: "snapshot-1",
									kind: "sales_pdf_snapshot:invoice_pdf",
									pathname: "sales/101/invoice.pdf",
									url: "https://blob.example/invoice.pdf",
									filename: "Invoice 09502PC.pdf",
									mimeType: "application/pdf",
								};
					},
				},
				assistantConversation: { findFirst: async () => null },
				salesOrders: { findFirst: async () => ({ id: 101 }) },
				salesDocumentSnapshot: {
					findFirst: async () => ({
						meta: {
							sourceRevision: "revision-1",
							expiresAt: "2099-09-19T10:01:00Z",
						},
					}),
				},
			} as never,
			{
				actor: {
					userId: 42,
					scopeType: "organization",
					scopeId: "7",
					grants: { viewOrders: true, viewOrderPayment: true },
				} as never,
				documentId: "sales-document-1",
			},
			async () => ({ revision: "revision-1" }) as never,
		);
		expect(result).toMatchObject({
			access: "public",
			ownerId: "101",
			pathname: "sales/101/invoice.pdf",
		});
	});

	test("denies Sales PDFs without finance permission", async () => {
		let reads = 0;
		const result = await resolveAssistantDocumentAccess(
			{
				storedDocument: {
					findFirst: async () => {
						reads += 1;
						return reads === 1
							? null
							: {
									ownerId: "101",
									sourceId: "snapshot-1",
									kind: "sales_pdf_snapshot:invoice_pdf",
									pathname: "sales/invoice.pdf",
								};
					},
				},
			} as never,
			{
				actor: {
					userId: 42,
					scopeType: "organization",
					scopeId: "7",
					grants: { viewOrders: true, viewOrderPayment: false },
				} as never,
				documentId: "sales-document-1",
			},
		);
		expect(result).toBeNull();
		expect(reads).toBe(2);
	});

	test("allows a non-financial Production PDF without payment access", async () => {
		let reads = 0;
		const result = await resolveAssistantDocumentAccess(
			{
				storedDocument: {
					findFirst: async () => {
						reads += 1;
						return reads === 1
							? null
							: {
									ownerId: "101",
									sourceId: "snapshot-1",
									kind: "sales_pdf_snapshot:production_pdf",
									pathname: "sales/production.pdf",
								};
					},
				},
				assistantConversation: { findFirst: async () => null },
				salesOrders: { findFirst: async () => ({ id: 101 }) },
				salesDocumentSnapshot: {
					findFirst: async () => ({
						meta: {
							sourceRevision: "revision-1",
							expiresAt: "2099-09-19T10:01:00Z",
						},
					}),
				},
			} as never,
			{
				actor: {
					userId: 42,
					scopeType: "organization",
					scopeId: "7",
					grants: { viewOrders: true, viewOrderPayment: false },
				} as never,
				documentId: "production-document-1",
			},
			async () => ({ revision: "revision-1" }) as never,
		);
		expect(result).toMatchObject({
			access: "public",
			pathname: "sales/production.pdf",
		});
	});

	test("denies an expired or source-stale Sales PDF", async () => {
		let documentRead = 0;
		const db = {
			storedDocument: {
				findFirst: async () => {
					documentRead += 1;
					return documentRead === 1
						? null
						: {
								ownerId: "101",
								sourceId: "snapshot-1",
								kind: "sales_pdf_snapshot:invoice_pdf",
								pathname: "sales/101/invoice.pdf",
							};
				},
			},
			assistantConversation: { findFirst: async () => null },
			salesOrders: { findFirst: async () => ({ id: 101 }) },
			salesDocumentSnapshot: {
				findFirst: async () => ({
					meta: {
						sourceRevision: "revision-old",
						expiresAt: "2099-09-19T10:01:00Z",
					},
				}),
			},
		};
		expect(
			await resolveAssistantDocumentAccess(
				db as never,
				{
					actor: {
						userId: 42,
						scopeType: "organization",
						scopeId: "7",
						grants: { viewOrders: true, viewOrderPayment: true },
					} as never,
					documentId: "sales-document-1",
				},
				async () => ({ revision: "revision-new" }) as never,
			),
		).toBeNull();
	});
});
