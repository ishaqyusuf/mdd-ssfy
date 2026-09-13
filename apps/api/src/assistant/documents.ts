import type { Database } from "@gnd/db";
import { canAssistantAccessSalesOrderId } from "@gnd/db/queries";
import type { AssistantActor } from "./actor";

export function trustedAssistantPublicBlobUrl(
	value: string | null | undefined,
) {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === "https:" &&
			url.hostname.endsWith(".public.blob.vercel-storage.com")
			? url.toString()
			: null;
	} catch {
		return null;
	}
}

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
	if (document?.pathname) {
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
		if (conversation) return { ...document, access: "private" as const };
	}

	if (input.actor.grants?.viewOrders !== true) return null;
	const salesDocument = await db.storedDocument.findFirst({
		where: {
			id: input.documentId,
			ownerType: "sales_order",
			visibility: "public",
			status: "ready",
			isCurrent: true,
			generated: true,
			sourceType: "sales_document_snapshot",
			deletedAt: null,
		},
		select: {
			ownerId: true,
			pathname: true,
			url: true,
			filename: true,
			mimeType: true,
		},
	});
	const salesOrderId = Number(salesDocument?.ownerId);
	if (
		!salesDocument?.pathname ||
		!Number.isSafeInteger(salesOrderId) ||
		!(await canAssistantAccessSalesOrderId(db, input.actor, salesOrderId))
	) {
		return null;
	}
	return { ...salesDocument, access: "public" as const };
}
