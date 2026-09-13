import {
	type AssistantEntityReference,
	assistantEntityReferenceSchema,
} from "@api/assistant/contracts";

export const assistantAppRoutes = {
	"sales-orders": "/sales-book/orders",
	"sales-customers": "/sales-book/customers",
	inventory: "/inventory",
	community: "/community",
	documents: "/settings/profile?tab=documents",
	assistant: "/assistant",
} as const;

export function parseAssistantEntity(
	value: unknown,
): AssistantEntityReference | null {
	const parsed = assistantEntityReferenceSchema.safeParse(value);
	return parsed.success ? parsed.data : null;
}

export function buildAssistantDocumentUrl(documentId: string) {
	return `/api/assistant/documents/${encodeURIComponent(documentId)}`;
}

export function assistantSalesEntityMode(
	entity: Extract<AssistantEntityReference, { kind: "order" }>,
) {
	return entity.salesType === "quote" ? ("quote" as const) : ("sales" as const);
}

export function assistantCommunityEntityRoute(
	entity: Extract<AssistantEntityReference, { kind: "community" }>,
) {
	return entity.communityType === "unit" && entity.slug
		? `/community/project-units/${encodeURIComponent(entity.slug)}`
		: null;
}

export function findAssistantDocumentEntity(
	messages: readonly unknown[],
	documentId: string | null,
) {
	if (!documentId) return null;
	for (const rawMessage of [...messages].reverse()) {
		if (!rawMessage || typeof rawMessage !== "object") continue;
		const parts = (rawMessage as { parts?: unknown }).parts;
		if (!Array.isArray(parts)) continue;
		for (const rawPart of [...parts].reverse()) {
			if (!rawPart || typeof rawPart !== "object") continue;
			const part = rawPart as { type?: unknown; data?: unknown };
			if (part.type !== "data-assistant-entity") continue;
			const entity = parseAssistantEntity(part.data);
			if (entity?.kind === "document" && entity.id === documentId)
				return entity;
		}
	}
	return null;
}
