export type AssistantApprovalReview = {
	title: string;
	effect: string;
	targetRevision: string | null;
	parameters: unknown;
	diff: { summary: string; changes: string[] };
};

function record(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Persisted reviews can predate the current contract. Never show an incomplete
// approval or assume that a database JSON value has the expected shape.
export function parseAssistantApprovalReview(value: unknown): AssistantApprovalReview {
	if (!record(value) || typeof value.title !== "string" ||
		typeof value.effect !== "string" || !record(value.diff) ||
		typeof value.diff.summary !== "string" || !Array.isArray(value.diff.changes) ||
		!value.diff.changes.every((change) => typeof change === "string") ||
		(value.targetRevision != null && typeof value.targetRevision !== "string")) {
		throw new Error("The approval review is unavailable");
	}
	return {
		title: value.title,
		effect: value.effect,
		targetRevision: typeof value.targetRevision === "string" ? value.targetRevision : null,
		parameters: value.parameters,
		diff: { summary: value.diff.summary, changes: value.diff.changes },
	};
}

export function assistantDocumentApprovalSummary(toolId: string, review: AssistantApprovalReview) {
	const input = review.parameters;
	if (!record(input) || typeof input.orderNo !== "string" || !input.orderNo.trim() ||
		(input.type !== undefined && input.type !== "order" && input.type !== "quote") ||
		(input.forceRegenerate !== undefined && typeof input.forceRegenerate !== "boolean")) {
		throw new Error("The document review is unavailable");
	}
	let document: string;
	switch (input.mode) {
		case "invoice": document = "Invoice"; break;
		case "quote": document = "Quote"; break;
		case "packing-slip": document = "Packing slip"; break;
		case "production": document = "Production document"; break;
		case "order-packing": document = "Order packing document"; break;
		default: throw new Error("The document review is unavailable");
	}
	if (toolId !== "documents_generate_pdf" && toolId !== "documents_cancel_pdf") {
		throw new Error("The document review is unavailable");
	}
	const cancelling = toolId === "documents_cancel_pdf";
	return {
		title: cancelling ? "Stop preparing this document?" : "Prepare this document?",
		confirmLabel: cancelling ? "Stop preparing" : "Confirm and prepare",
		successMessage: cancelling ? "The document request was stopped." : "PDF generation started.",
		recordLabel: input.type === "quote" ? "Quote number" : "Order number",
		orderNo: input.orderNo,
		document,
		description: cancelling ? "Stop the document request shown below."
			: input.forceRegenerate ? "Prepare a fresh PDF using the latest information."
				: "Prepare a PDF for the request shown below.",
	};
}
