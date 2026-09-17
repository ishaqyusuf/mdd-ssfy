const assistantContextEntityTypes = ["order", "quote"] as const;
const assistantContextIntents = ["status-and-blockers"] as const;

export type AssistantWebsiteContext = {
	entityType: (typeof assistantContextEntityTypes)[number];
	entityId: string;
	intent: (typeof assistantContextIntents)[number];
};

type AssistantContextParams = Pick<URLSearchParams, "get">;

function parseAssistantWebsiteContext(
	params: AssistantContextParams,
): AssistantWebsiteContext | null {
	const entityType = params.get("entityType");
	const entityId = params.get("entityId")?.trim();
	const intent = params.get("intent");
	if (
		!assistantContextEntityTypes.includes(
			entityType as AssistantWebsiteContext["entityType"],
		) ||
		!entityId ||
		!/^[A-Za-z0-9._/-]{1,64}$/.test(entityId) ||
		!assistantContextIntents.includes(
			intent as AssistantWebsiteContext["intent"],
		)
	) {
		return null;
	}
	return {
		entityType: entityType as AssistantWebsiteContext["entityType"],
		entityId,
		intent: intent as AssistantWebsiteContext["intent"],
	};
}

export function readAssistantContextPrompt(params: AssistantContextParams) {
	const context = parseAssistantWebsiteContext(params);
	if (!context) return "";
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
