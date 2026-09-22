export type AssistantWebsiteContext =
	| {
			entityType: "order" | "quote";
			entityId: string;
			intent: "status-and-blockers";
	  }
	| {
			entityType: "customer";
			entityId: string;
			intent: "summary-and-history";
	  };

type AssistantContextParams = Pick<URLSearchParams, "get">;

function parseAssistantWebsiteContext(
	params: AssistantContextParams,
): AssistantWebsiteContext | null {
	const entityType = params.get("entityType");
	const entityId = params.get("entityId")?.trim();
	const intent = params.get("intent");
	if (!entityId || !/^[A-Za-z0-9._/-]{1,64}$/.test(entityId)) return null;

	if (
		(entityType === "order" || entityType === "quote") &&
		intent === "status-and-blockers"
	) {
		return { entityType, entityId, intent };
	}
	if (entityType === "customer" && intent === "summary-and-history") {
		return { entityType, entityId, intent };
	}
	return null;
}

export function readAssistantContextPrompt(params: AssistantContextParams) {
	const context = parseAssistantWebsiteContext(params);
	if (!context) return "";
	if (context.entityType === "customer") {
		return `Summarize customer account ${context.entityId} and their order history.`;
	}
	return `Check status and explain blockers for ${context.entityType} ${context.entityId}.`;
}

export function buildAssistantContextUrl(context: AssistantWebsiteContext) {
	const params = new URLSearchParams({
		entityType: context.entityType,
		entityId: context.entityId,
		intent: context.intent,
	});
	if (!parseAssistantWebsiteContext(params)) {
		throw new Error("Assistant website context is invalid");
	}
	return `/assistant?${params}`;
}
