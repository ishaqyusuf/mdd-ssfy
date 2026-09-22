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
export function parseAssistantApprovalReview(
	value: unknown,
): AssistantApprovalReview {
	if (
		!record(value) ||
		typeof value.title !== "string" ||
		typeof value.effect !== "string" ||
		!record(value.diff) ||
		typeof value.diff.summary !== "string" ||
		!Array.isArray(value.diff.changes) ||
		!value.diff.changes.every((change) => typeof change === "string") ||
		(value.targetRevision != null && typeof value.targetRevision !== "string")
	) {
		throw new Error("The approval review is unavailable");
	}
	return {
		title: value.title,
		effect: value.effect,
		targetRevision:
			typeof value.targetRevision === "string" ? value.targetRevision : null,
		parameters: value.parameters,
		diff: { summary: value.diff.summary, changes: value.diff.changes },
	};
}

export function assistantApprovalSummary(
	toolId: string,
	review: AssistantApprovalReview,
) {
	const input = review.parameters;
	if (
		!record(input) ||
		typeof input.orderNo !== "string" ||
		!input.orderNo.trim() ||
		(input.type !== undefined &&
			input.type !== "order" &&
			input.type !== "quote")
	) {
		throw new Error("The approval review is unavailable");
	}
	if (toolId === "sales_update_purchase_order") {
		if (
			typeof input.previousPurchaseOrderNumber !== "string" ||
			typeof input.purchaseOrderNumber !== "string"
		) {
			throw new Error("The Sales update review is unavailable");
		}
		return {
			title: "Update P.O. number?",
			confirmLabel: "Confirm update",
			successMessage: "The P.O. number was updated.",
			declineMessage: "The P.O. number update was declined.",
			description:
				"Review the existing and proposed values before updating this Sales record.",
			details: [
				{
					label: input.type === "quote" ? "Quote number" : "Order number",
					value: input.orderNo,
				},
				{
					label: "Current P.O.",
					value: input.previousPurchaseOrderNumber || "None",
				},
				{
					label: "New P.O.",
					value: input.purchaseOrderNumber || "None",
				},
			],
		};
	}
	if (toolId === "finance_record_manual_payment") {
		const paymentMethods = {
			check: "Check",
			cash: "Cash",
			zelle: "Zelle",
			"credit-card": "Credit card",
			wire: "Wire",
		} as const;
		const amount = input.amount;
		const currentDue = Number(input.expectedAmountDue);
		const paymentMethod =
			typeof input.paymentMethod === "string" &&
			input.paymentMethod in paymentMethods
				? paymentMethods[input.paymentMethod as keyof typeof paymentMethods]
				: null;
		if (
			typeof input.accountNo !== "string" ||
			!input.accountNo.trim() ||
			typeof amount !== "number" ||
			!Number.isFinite(amount) ||
			amount <= 0 ||
			!Number.isFinite(currentDue) ||
			currentDue < amount ||
			!paymentMethod ||
			(input.checkNo !== undefined && typeof input.checkNo !== "string")
		) {
			throw new Error("The payment review is unavailable");
		}
		const money = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format;
		return {
			title: "Record this payment?",
			confirmLabel: "Confirm payment",
			successMessage: "The payment was recorded.",
			declineMessage: "The payment was declined.",
			description:
				"Review the payment and remaining balance before recording it.",
			details: [
				{ label: "Order number", value: input.orderNo },
				{ label: "Customer account", value: input.accountNo },
				{ label: "Payment", value: money(amount) },
				{ label: "Method", value: paymentMethod },
				...(input.checkNo
					? [{ label: "Check number", value: input.checkNo }]
					: []),
				{ label: "Current amount due", value: money(currentDue) },
				{
					label: "Amount due after payment",
					value: money(currentDue - amount),
				},
			],
		};
	}
	if (toolId === "finance_create_square_refund") {
		const amount = input.amount;
		const currentRefundableCents = input.expectedRemainingRefundableCents;
		if (
			typeof input.transactionRef !== "string" ||
			!input.transactionRef.trim() ||
			typeof input.reason !== "string" ||
			input.reason.trim().length < 3 ||
			typeof amount !== "number" ||
			!Number.isFinite(amount) ||
			amount <= 0 ||
			typeof currentRefundableCents !== "number" ||
			!Number.isInteger(currentRefundableCents) ||
			currentRefundableCents <= 0 ||
			Math.round(amount * 100) > currentRefundableCents
		) {
			throw new Error("The refund review is unavailable");
		}
		const money = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format;
		const currentRefundable = currentRefundableCents / 100;
		return {
			title: "Create this refund request?",
			confirmLabel: "Confirm refund",
			successMessage: "The refund request was created.",
			declineMessage: "The refund request was declined.",
			description:
				"Review the payment, amount, and reason before requesting the Square refund.",
			details: [
				{ label: "Order number", value: input.orderNo },
				{ label: "Payment", value: "Completed Square payment" },
				{ label: "Refund", value: money(amount) },
				{ label: "Reason", value: input.reason },
				{ label: "Currently refundable", value: money(currentRefundable) },
				{
					label: "Refundable after request",
					value: money(currentRefundable - amount),
				},
			],
		};
	}
	if (
		(input.forceRegenerate !== undefined &&
			typeof input.forceRegenerate !== "boolean") ||
		(toolId !== "documents_generate_pdf" && toolId !== "documents_cancel_pdf")
	) {
		throw new Error("The document review is unavailable");
	}
	let document: string;
	switch (input.mode) {
		case "invoice":
			document = "Invoice";
			break;
		case "quote":
			document = "Quote";
			break;
		case "packing-slip":
			document = "Packing slip";
			break;
		case "production":
			document = "Production document";
			break;
		case "order-packing":
			document = "Order packing document";
			break;
		default:
			throw new Error("The document review is unavailable");
	}
	const cancelling = toolId === "documents_cancel_pdf";
	return {
		title: cancelling
			? "Stop preparing this document?"
			: "Prepare this document?",
		confirmLabel: cancelling ? "Stop preparing" : "Confirm and prepare",
		successMessage: cancelling
			? "The document request was stopped."
			: "PDF generation started.",
		declineMessage: "PDF generation was declined.",
		description: cancelling
			? "Stop the document request shown below."
			: input.forceRegenerate
				? "Prepare a fresh PDF using the latest information."
				: "Prepare a PDF for the request shown below.",
		details: [
			{
				label: input.type === "quote" ? "Quote number" : "Order number",
				value: input.orderNo,
			},
			{ label: "Document", value: document },
		],
	};
}
