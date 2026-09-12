import { resolveAssistantActor } from "@api/assistant/actor";
import {
	AssistantConversationAccessError,
	archiveAssistantConversation,
	createAssistantConversation,
	getAssistantConversation,
	listAssistantConversations,
	softDeleteAssistantConversation,
} from "@gnd/db/queries";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

async function actorOrThrow(ctx: {
	db: Parameters<typeof resolveAssistantActor>[0];
	userId: number;
}) {
	const actor = await resolveAssistantActor(ctx.db, ctx.userId);
	if (!actor) throw new TRPCError({ code: "FORBIDDEN" });
	return actor;
}

function scope(actor: { userId: number; scopeType: string; scopeId: string }) {
	return {
		ownerUserId: actor.userId,
		scopeType: actor.scopeType,
		scopeId: actor.scopeId,
	};
}

function notFound(error: unknown): never {
	if (error instanceof AssistantConversationAccessError) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Conversation was not found",
		});
	}
	throw error;
}

export const assistantRouter = createTRPCRouter({
	create: protectedProcedure
		.input(
			z.object({ title: z.string().trim().max(500).optional() }).optional(),
		)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			const conversation = await createAssistantConversation(ctx.db, {
				...scope(actor),
				title: input?.title,
			});
			return {
				id: conversation.id,
				title: conversation.title,
				updatedAt: conversation.updatedAt,
				archivedAt: conversation.archivedAt,
			};
		}),
	list: protectedProcedure
		.input(
			z.object({
				search: z.string().trim().max(500).optional(),
				includeArchived: z.boolean().default(false),
				take: z.number().int().min(1).max(100).default(30),
			}),
		)
		.query(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			const conversations = await listAssistantConversations(ctx.db, {
				...scope(actor),
				...input,
			});
			return conversations.map((conversation) => ({
				id: conversation.id,
				title: conversation.title,
				updatedAt: conversation.updatedAt,
				archivedAt: conversation.archivedAt,
			}));
		}),
	get: protectedProcedure
		.input(z.object({ conversationId: z.string().min(1).max(191) }))
		.query(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			const conversation = await getAssistantConversation(ctx.db, {
				...scope(actor),
				conversationId: input.conversationId,
			});
			if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });
			const latestRun = await ctx.db.assistantRun.findFirst({
				where: {
					conversationId: conversation.id,
					actorUserId: actor.userId,
				},
				orderBy: { createdAt: "desc" },
				select: { id: true, status: true, lastSequence: true },
			});
			return {
				id: conversation.id,
				title: conversation.title,
				updatedAt: conversation.updatedAt,
				archivedAt: conversation.archivedAt,
				messages: conversation.messages.map((message) => ({
					id: message.id,
					role: message.role,
					parts: message.parts,
					sequence: message.sequence,
				})),
				latestRun,
			};
		}),
	setTitle: protectedProcedure
		.input(
			z.object({
				conversationId: z.string().min(1).max(191),
				title: z.string().trim().min(1).max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			const result = await ctx.db.assistantConversation.updateMany({
				where: { id: input.conversationId, ...scope(actor), deletedAt: null },
				data: { title: input.title },
			});
			if (result.count !== 1)
				return notFound(new AssistantConversationAccessError());
			return { id: input.conversationId, title: input.title };
		}),
	archive: protectedProcedure
		.input(
			z.object({
				conversationId: z.string().min(1).max(191),
				archived: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			try {
				const conversation = await archiveAssistantConversation(ctx.db, {
					...scope(actor),
					...input,
				});
				if (!conversation)
					return notFound(new AssistantConversationAccessError());
				return { id: conversation.id, archivedAt: conversation.archivedAt };
			} catch (error) {
				return notFound(error);
			}
		}),
	delete: protectedProcedure
		.input(z.object({ conversationId: z.string().min(1).max(191) }))
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			try {
				const conversation = await softDeleteAssistantConversation(ctx.db, {
					...scope(actor),
					...input,
				});
				return { id: conversation.id, deleted: true as const };
			} catch (error) {
				return notFound(error);
			}
		}),
});
