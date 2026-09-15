import { expect, test } from "bun:test";
import { assistantDocumentApprovalSummary, parseAssistantApprovalReview } from "./assistant-approval-review";

const review = { title: "Generate PDF", effect: "artifact", parameters: { orderNo: "QA-123" }, diff: { summary: "Prepare this document.", changes: ["Generate PDF"] } };

test("retains the reviewed business request and supports absent legacy revisions", () => {
	expect(parseAssistantApprovalReview(review)).toEqual({ ...review, targetRevision: null });
});

test("document approval shows business details without internal request fields", () => {
	const parsed = parseAssistantApprovalReview({ ...review, parameters: {
		orderNo: "QA-123", mode: "packing-slip", type: "order", forceRegenerate: true,
		expectedRevision: "private-revision", snapshotId: "private-snapshot",
	} });
	const summary = assistantDocumentApprovalSummary("documents_generate_pdf", parsed);
	expect(summary).toMatchObject({ orderNo: "QA-123", document: "Packing slip", description: "Prepare a fresh PDF using the latest information." });
	expect(JSON.stringify(summary)).not.toContain("private-");
	expect(assistantDocumentApprovalSummary("documents_cancel_pdf", parsed)).toMatchObject({ confirmLabel: "Stop preparing", successMessage: "The document request was stopped." });
});

test("unknown document actions or malformed requests cannot receive a generic confirmation", () => {
	const parsed = parseAssistantApprovalReview(review);
	for (const parameters of [{ mode: "invoice" }, { orderNo: "QA-123", mode: "unknown" }, { orderNo: "QA-123", mode: "invoice", forceRegenerate: "yes" }]) {
		expect(() => assistantDocumentApprovalSummary("documents_generate_pdf", { ...parsed, parameters })).toThrow();
	}
	expect(() => assistantDocumentApprovalSummary("unknown_write", { ...parsed, parameters: { orderNo: "QA-123", mode: "invoice" } })).toThrow();
});

test("incomplete or malformed stored reviews cannot reach confirmation", () => {
	for (const input of [null, {}, { ...review, diff: null }, { ...review, diff: { summary: "Prepare", changes: [123] } }, { ...review, title: undefined }, { ...review, targetRevision: {} }]) {
		expect(() => parseAssistantApprovalReview(input)).toThrow("The approval review is unavailable");
	}
});
