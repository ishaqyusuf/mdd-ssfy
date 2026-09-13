import type { Database } from "@gnd/db";
import type { AssistantActor } from "./actor";

export async function resolveAssistantDocumentAccess(
	db: Database,
	input: { actor: AssistantActor; documentId: string },
) {
	const document = await db.storedDocument.findFirst({
		where: {
			id: input.documentId,
			ownerType: "assistant_conversation",
			visibility: "private",
			status: "ready",
			isCurrent: true,
			provider: "vercel-blob",
			deletedAt: null,
		},
		select: {
			ownerId: true,
			pathname: true,
			filename: true,
			mimeType: true,
		},
	});
	if (!document?.pathname) return null;
	const conversation = await db.assistantConversation.findFirst({
		where: {
			id: document.ownerId,
			ownerUserId: input.actor.userId,
			scopeType: input.actor.scopeType,
			scopeId: input.actor.scopeId,
			deletedAt: null,
		},
		select: { id: true },
	});
	return conversation ? document : null;
}
