import type { UIMessage } from "ai";

export type AssistantSalesRequestOffer = {
	messageId: string;
	sourceText: string;
	type: "order" | "quote";
};

export function isAssistantSalesRequestConfirmation(text: string) {
	return /^(?:yes(?:\s+please)?|sure|go ahead|sí|si|(?:yes[,\s]+)?(?:please\s+)?(?:create|start|prepare|make)(?:\s+(?:a|an|the|this))?\s+(?:sale|sales request|order|quote)(?:\s+from\s+(?:that|this|the)\s+(?:door\s+)?(?:schedule|list|request))?)[.!\s]*$/i.test(
		text.trim(),
	);
}

function userText(message: UIMessage) {
	if (
		message.role !== "user" ||
		message.parts.some((part) => part.type === "file")
	)
		return null;
	return message.parts
		.flatMap((part) => (part.type === "text" ? [part.text] : []))
		.join("\n");
}

function looksLikeSalesRequest(text: string) {
	if (!text.trim() || text.length > 32_000) return false;
	const product =
		/\b(?:doors?|slabs?|prehung|pre-hung|bi-?fold|louvres?|louvers?|mouldings?|moldings?|baseboards?|flat board|attic access|millwork|puertas?)\b/i;
	if (!product.test(text)) return false;
	if (
		/^(?:check|find|show|look up|explain|how|what|when|where|why)\b/i.test(
			text.trim(),
		)
	)
		return false;
	const dimensions = /\d+(?:[\s/-]+\d+)?\s*["”″']?\s*[x×]\s*\d+/i;
	const requestedPricing =
		/\b(?:please quote|quote (?:for|the|\d|one|two|three|four)|quotation|pricing (?:for|on)|request for quote|cotizaci[oó]n)\b/i;
	return (
		requestedPricing.test(text) ||
		(dimensions.test(text) &&
			(text.includes("\n") ||
				/\b(?:rough openings?|schedule|need|supply|order|quote)\b/i.test(text)))
	);
}

/** Reconstructed from owned user messages; model replies never become request source. */
export function findAssistantSalesRequestOffer(
	messages: UIMessage[],
): AssistantSalesRequestOffer | null {
	const users = messages.filter((message) => message.role === "user");
	const latest = users.at(-1);
	if (!latest) return null;
	const latestText = userText(latest);
	if (latestText === null) return null;
	let source = latest;
	for (let index = users.length - 1; index >= 0; index--) {
		const candidate = users[index];
		if (!candidate) return null;
		const text = userText(candidate);
		if (text === null) return null;
		if (!isAssistantSalesRequestConfirmation(text)) {
			source = candidate;
			break;
		}
	}
	if (!source) return null;
	const sourceText = userText(source);
	return sourceText && looksLikeSalesRequest(sourceText)
		? {
				messageId: source.id,
				sourceText,
				type: /\b(?:quote|quotation|request for quote|cotizaci[oó]n)\b/i.test(
					sourceText,
				)
					? "quote"
					: "order",
			}
		: null;
}
