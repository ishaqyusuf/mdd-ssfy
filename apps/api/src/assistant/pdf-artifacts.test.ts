import { describe, expect, test } from "bun:test";
import {
	getAssistantSalesPdfStatus,
	isAssistantSalesPdfModeSupported,
} from "./pdf-artifacts";

describe("Assistant PDF artifact status", () => {
	test("enforces order and quote document families", () => {
		expect(
			isAssistantSalesPdfModeSupported({ salesType: "quote", mode: "quote" }),
		).toBe(true);
		expect(
			isAssistantSalesPdfModeSupported({ salesType: "quote", mode: "invoice" }),
		).toBe(false);
		expect(
			isAssistantSalesPdfModeSupported({ salesType: "order", mode: "invoice" }),
		).toBe(true);
		expect(
			isAssistantSalesPdfModeSupported({ salesType: "order", mode: "quote" }),
		).toBe(false);
	});

	test("returns an on-demand state without creating a document", async () => {
		const result = await getAssistantSalesPdfStatus(
			{
				salesDocumentSnapshot: { findFirst: async () => null },
			} as never,
			{ salesOrderId: 42, salesUpdatedAt: null, mode: "invoice" },
		);
		expect(result).toMatchObject({
			status: "on_demand",
			documentType: "invoice_pdf",
			documentId: null,
		});
	});

	test("returns only a current ready document and marks stale sources", async () => {
		const result = await getAssistantSalesPdfStatus(
			{
				salesDocumentSnapshot: {
					findFirst: async () => ({
						id: "snapshot-1",
						storedDocumentId: "document-1",
						generationStatus: "ready",
						sourceUpdatedAt: new Date("2026-09-12T10:00:00Z"),
						generatedAt: new Date("2026-09-12T10:01:00Z"),
						failedAt: null,
						updatedAt: new Date("2026-09-12T10:01:00Z"),
						meta: { expiresAt: "2026-09-19T10:01:00Z" },
					}),
				},
				storedDocument: { findFirst: async () => ({ id: "document-1" }) },
			} as never,
			{
				salesOrderId: 42,
				salesUpdatedAt: "2026-09-12T11:00:00Z",
				mode: "invoice",
			},
		);
		expect(result.status).toBe("stale");
		expect(result.documentId).toBeNull();
	});
});
