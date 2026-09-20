import { getSalesRequestConfigurationContext } from "@api/services/sales-request-configuration-context";
import { selectSalesRequestSettingId } from "@api/services/sales-request-preview";
import { authorizeSalesRequestPreview } from "@api/services/sales-request-preview-dependencies";
import type { Database } from "@gnd/db";
import {
	getSalesRequestCatalogSettings,
	isSalesRequestCatalogPublicationCurrent,
} from "@gnd/settings";
import { TRPCError } from "@trpc/server";
import { assistantSalesRequestDraftPreviewSchema } from "./order-draft-contract";
import type { AssistantToolActor } from "./registry";
import { getAssistantRuntimeConfiguration } from "./runtime-settings";

const HANDOFF_AGE_MS = 15 * 60 * 1000;

/** The Sales form reads the saved preview itself; a URL never carries its contents. */
export async function getAssistantSalesDraftHandoff(
	db: Database,
	actor: AssistantToolActor,
	input: { conversationId: string; generationId: string },
	now = new Date(),
) {
	const conversation = await db.assistantConversation.findFirst({
		where: {
			id: input.conversationId,
			ownerUserId: actor.userId,
			scopeType: actor.scopeType,
			scopeId: actor.scopeId,
			deletedAt: null,
		},
		select: { id: true },
	});
	if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

	const session = await db.assistantSalesRequestSession.findFirst({
		where: {
			conversationId: conversation.id,
			ownerUserId: actor.userId,
			scopeType: actor.scopeType,
			scopeId: actor.scopeId,
			generationId: input.generationId,
			status: "ready",
		},
		select: { finalPreview: true, completedAt: true, saleType: true },
	});
	if (session) {
		const retained = assistantSalesRequestDraftPreviewSchema.safeParse(session.finalPreview);
		const savedReceipt = retained.success ? retained.data.savedSale : null;
		const run = savedReceipt ? null : await db.salesRequestGenerationRun.findFirst({
			where: {
				generationId: input.generationId,
				actorUserId: actor.userId,
				consumedSalesId: { not: null },
				deletedAt: null,
			},
			select: { consumedSalesId: true },
		});
		if (savedReceipt || run?.consumedSalesId) {
			const savedSale = await db.salesOrders.findFirst({
				where: {
					...(savedReceipt ? { slug: savedReceipt.slug } : { id: run!.consumedSalesId! }),
					type: session.saleType,
					deletedAt: null,
				},
				select: { orderId: true, slug: true },
			});
			if (savedSale) return { preview: null, savedSale };
		}
	}
	const isCurrent = session?.completedAt &&
		session.completedAt.getTime() > now.getTime() - HANDOFF_AGE_MS &&
		session.completedAt.getTime() <= now.getTime();
	let preview = assistantSalesRequestDraftPreviewSchema.safeParse(
		isCurrent ? session?.finalPreview : null,
	);
	if (!preview.success) {
		// Existing Assistant tool results are durable conversation messages too.
		const messages = await db.assistantMessage.findMany({
			where: { conversationId: conversation.id, role: "assistant" },
			orderBy: { sequence: "desc" },
			take: 200,
			select: { parts: true, createdAt: true },
		});
		for (const message of messages) {
			if (
				message.createdAt.getTime() > now.getTime() ||
				message.createdAt.getTime() <= now.getTime() - HANDOFF_AGE_MS ||
				!Array.isArray(message.parts)
			)
				continue;
			for (const part of message.parts) {
				if (!part || typeof part !== "object" || Array.isArray(part)) continue;
				if (part.type !== "data-assistant-order-draft") continue;
				const parsed = assistantSalesRequestDraftPreviewSchema.safeParse(
					part.data,
				);
				if (parsed.success && parsed.data.generationId === input.generationId) {
					preview = parsed;
					break;
				}
			}
			if (preview.success) break;
		}
	}
	if (!preview.success || preview.data.generationId !== input.generationId) {
		throw new TRPCError({ code: "NOT_FOUND" });
	}
	if (preview.data.seed.lineItems.length === 0) {
		throw new TRPCError({
			code: "CONFLICT",
			message:
				"No Sales item could be mapped. Review the unresolved request in Assistant.",
		});
	}

	await authorizeSalesRequestPreview({
		db,
		userId: actor.userId,
		type: preview.data.type,
	});
	const [model, settings] = await Promise.all([
		getAssistantRuntimeConfiguration(db),
		db.settings.findMany({
			where: { type: "sales-settings", deletedAt: null },
			select: { id: true },
		}),
	]);
	if (
		model.selection.provider !== preview.data.provider ||
		model.selection.model !== preview.data.model
	) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "The Assistant model changed. Generate a new draft.",
		});
	}
	const settingId = selectSalesRequestSettingId(settings.map((row) => row.id));
	const [snapshot, catalog] = await Promise.all([
		getSalesRequestConfigurationContext(db, { settingId }),
		getSalesRequestCatalogSettings(db, settingId),
	]);
	if (
		snapshot.scope !== preview.data.configurationScope ||
		snapshot.revision !== preview.data.configurationRevision ||
		!isSalesRequestCatalogPublicationCurrent(
			catalog.publication,
			snapshot.revision,
		)
	) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "The Sales catalog changed. Generate a new draft.",
		});
	}
	return {
		savedSale: null,
		preview: {
			...preview.data,
			clarification: null,
			userReviewed: true as const,
		},
	};
}
