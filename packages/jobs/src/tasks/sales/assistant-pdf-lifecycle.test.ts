import { describe, expect, test } from "bun:test";
import {
	ASSISTANT_PDF_MAX_ATTEMPTS,
	assistantPdfFailureState,
	cleanupAssistantPdfUpload,
} from "./assistant-pdf-lifecycle";

describe("Assistant PDF worker lifecycle", () => {
	test("returns a claimed Assistant snapshot to pending for provider retries", () => {
		expect(
			assistantPdfFailureState({
				hasAssistantSnapshot: true,
				attemptNumber: 1,
			}),
		).toEqual({ generationStatus: "pending", isCurrent: true });
		expect(
			assistantPdfFailureState({
				hasAssistantSnapshot: true,
				attemptNumber: 2,
			}),
		).toEqual({ generationStatus: "pending", isCurrent: true });
	});

	test("terminalizes the final attempt and non-Assistant warmups", () => {
		expect(
			assistantPdfFailureState({
				hasAssistantSnapshot: true,
				attemptNumber: ASSISTANT_PDF_MAX_ATTEMPTS,
			}),
		).toEqual({ generationStatus: "failed", isCurrent: false });
		expect(
			assistantPdfFailureState({
				hasAssistantSnapshot: false,
				attemptNumber: 1,
			}),
		).toEqual({ generationStatus: "failed", isCurrent: false });
	});
});

describe("Assistant PDF artifact cleanup", () => {
	test("deletes storage before tombstoning the durable record", async () => {
		const sequence: string[] = [];
		const result = await cleanupAssistantPdfUpload({
			pathname: "sales/order/invoice.pdf",
			storedDocumentId: "document-1",
			deleteBlob: async () => sequence.push("blob"),
			markDeleted: async () => sequence.push("deleted"),
			markCleanupRequired: async () => sequence.push("cleanup-required"),
			recordCleanupRequired: async () => sequence.push("recovery-record"),
		});
		expect(result.status).toBe("deleted");
		expect(sequence).toEqual(["blob", "deleted"]);
	});

	test("preserves a recovery handle when blob deletion fails", async () => {
		const sequence: string[] = [];
		const result = await cleanupAssistantPdfUpload({
			pathname: "sales/order/invoice.pdf",
			storedDocumentId: "document-1",
			deleteBlob: async () => {
				throw new Error("storage unavailable");
			},
			markDeleted: async () => sequence.push("deleted"),
			markCleanupRequired: async () => sequence.push("cleanup-required"),
			recordCleanupRequired: async () => sequence.push("recovery-record"),
		});
		expect(result.status).toBe("cleanup_required");
		expect(sequence).toEqual(["cleanup-required"]);
	});

	test("records an unregistered upload when deletion also fails", async () => {
		const sequence: string[] = [];
		const result = await cleanupAssistantPdfUpload({
			pathname: "sales/order/invoice.pdf",
			deleteBlob: async () => {
				throw new Error("storage unavailable");
			},
			markDeleted: async () => sequence.push("deleted"),
			markCleanupRequired: async () => sequence.push("cleanup-required"),
			recordCleanupRequired: async () => sequence.push("recovery-record"),
		});
		expect(result.status).toBe("cleanup_required");
		expect(sequence).toEqual(["recovery-record"]);
	});

	test("contains tombstone failures after the blob is deleted", async () => {
		const sequence: string[] = [];
		const result = await cleanupAssistantPdfUpload({
			pathname: "sales/order/invoice.pdf",
			storedDocumentId: "document-1",
			deleteBlob: async () => sequence.push("blob"),
			markDeleted: async () => {
				sequence.push("deleted");
				throw new Error("database unavailable");
			},
			markCleanupRequired: async () => sequence.push("cleanup-required"),
			recordCleanupRequired: async () => sequence.push("recovery-record"),
		});
		expect(result.status).toBe("cleanup_required");
		expect(sequence).toEqual(["blob", "deleted", "cleanup-required"]);
	});
});
