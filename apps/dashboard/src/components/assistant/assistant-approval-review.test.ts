import { expect, test } from "bun:test";
import {
	assistantApprovalSummary,
	parseAssistantApprovalReview,
} from "./assistant-approval-review";

const review = {
	title: "Generate PDF",
	effect: "artifact",
	parameters: { orderNo: "QA-123" },
	diff: { summary: "Prepare this document.", changes: ["Generate PDF"] },
};

test("retains the reviewed business request and supports absent legacy revisions", () => {
	expect(parseAssistantApprovalReview(review)).toEqual({
		...review,
		targetRevision: null,
	});
});

test("document approval shows business details without internal request fields", () => {
	const parsed = parseAssistantApprovalReview({
		...review,
		parameters: {
			orderNo: "QA-123",
			mode: "packing-slip",
			type: "order",
			forceRegenerate: true,
			expectedRevision: "private-revision",
			snapshotId: "private-snapshot",
		},
	});
	const summary = assistantApprovalSummary("documents_generate_pdf", parsed);
	expect(summary).toMatchObject({
		details: [
			{ label: "Order number", value: "QA-123" },
			{ label: "Document", value: "Packing slip" },
		],
		description: "Prepare a fresh PDF using the latest information.",
	});
	expect(JSON.stringify(summary)).not.toContain("private-");
	expect(
		assistantApprovalSummary("documents_cancel_pdf", parsed),
	).toMatchObject({
		confirmLabel: "Stop preparing",
		successMessage: "The document request was stopped.",
	});
});

test("Sales approval shows the exact P.O. number change", () => {
	const parsed = parseAssistantApprovalReview({
		...review,
		effect: "write",
		parameters: {
			orderNo: "09673PC",
			type: "order",
			previousPurchaseOrderNumber: "OLD-PO",
			purchaseOrderNumber: "NEW-PO",
			expectedRevision: "private-revision",
		},
	});
	expect(
		assistantApprovalSummary("sales_update_purchase_order", parsed),
	).toMatchObject({
		title: "Update P.O. number?",
		confirmLabel: "Confirm update",
		details: [
			{ label: "Order number", value: "09673PC" },
			{ label: "Current P.O.", value: "OLD-PO" },
			{ label: "New P.O.", value: "NEW-PO" },
		],
	});
});

test("manual payment approval shows the exact payment and resulting balance", () => {
	const parsed = parseAssistantApprovalReview({
		...review,
		effect: "write",
		parameters: {
			orderNo: "09673PC",
			accountNo: "cust-34",
			amount: 1,
			paymentMethod: "cash",
			expectedAmountDue: "513.91",
			expectedRevision: "private-revision",
		},
	});
	expect(
		assistantApprovalSummary("finance_record_manual_payment", parsed),
	).toMatchObject({
		title: "Record this payment?",
		confirmLabel: "Confirm payment",
		details: [
			{ label: "Order number", value: "09673PC" },
			{ label: "Customer account", value: "cust-34" },
			{ label: "Payment", value: "$1.00" },
			{ label: "Method", value: "Cash" },
			{ label: "Current amount due", value: "$513.91" },
			{ label: "Amount due after payment", value: "$512.91" },
		],
	});
});

test("Square refund approval shows the reviewed payment and remaining capacity", () => {
	const parsed = parseAssistantApprovalReview({
		...review,
		effect: "destructive",
		parameters: {
			orderNo: "09646AD",
			transactionRef: "payment:501",
			amount: 0.01,
			reason: "Assistant local sandbox acceptance",
			expectedRemainingRefundableCents: 44805,
			expectedRevision: "private-revision",
		},
	});
	expect(
		assistantApprovalSummary("finance_create_square_refund", parsed),
	).toMatchObject({
		title: "Create this refund request?",
		confirmLabel: "Confirm refund",
		details: [
			{ label: "Order number", value: "09646AD" },
			{ label: "Payment", value: "Completed Square payment" },
			{ label: "Refund", value: "$0.01" },
			{ label: "Reason", value: "Assistant local sandbox acceptance" },
			{ label: "Currently refundable", value: "$448.05" },
			{ label: "Refundable after request", value: "$448.04" },
		],
	});
});

test("unknown document actions or malformed requests cannot receive a generic confirmation", () => {
	const parsed = parseAssistantApprovalReview(review);
	for (const parameters of [
		{ mode: "invoice" },
		{ orderNo: "QA-123", mode: "unknown" },
		{ orderNo: "QA-123", mode: "invoice", forceRegenerate: "yes" },
	]) {
		expect(() =>
			assistantApprovalSummary("documents_generate_pdf", {
				...parsed,
				parameters,
			}),
		).toThrow();
	}
	expect(() =>
		assistantApprovalSummary("unknown_write", {
			...parsed,
			parameters: { orderNo: "QA-123", mode: "invoice" },
		}),
	).toThrow();
});

test("incomplete or malformed stored reviews cannot reach confirmation", () => {
	for (const input of [
		null,
		{},
		{ ...review, diff: null },
		{ ...review, diff: { summary: "Prepare", changes: [123] } },
		{ ...review, title: undefined },
		{ ...review, targetRevision: {} },
	]) {
		expect(() => parseAssistantApprovalReview(input)).toThrow(
			"The approval review is unavailable",
		);
	}
});
