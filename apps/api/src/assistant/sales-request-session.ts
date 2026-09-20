import {
	type ClarificationDatabase,
	answerSalesRequestClarification,
	beginSalesRequestClarification,
	isOrderSpecificClarificationField,
	ownedClarification,
} from "@api/services/sales-request-clarification";
import type { Database, Prisma } from "@gnd/db";
import {
	appendAssistantUserMessage,
	createAssistantSalesRequestSession,
	getAssistantConversation,
	getAssistantSalesRequestSession,
} from "@gnd/db/queries";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assistantSalesRequestDraftPreviewSchema } from "./order-draft-contract";
import { createAssistantSalesRequestPreviewDependencies } from "./order-drafts";
import type { AssistantToolActor } from "./registry";
import { resolveAssistantRuntimeSelection } from "./runtime";
import { getAssistantRuntimeConfiguration } from "./runtime-settings";

const questionSchema = z.object({
	id: z.string().uuid(),
	lineUid: z.string().nullable(),
	field: z.string(),
	question: z.string(),
	sourceText: z.string().nullable(),
	reason: z.string(),
	options: z
		.array(z.object({ value: z.string(), label: z.string() }))
		.optional(),
	canSaveRule: z.boolean().optional(),
});

export const startAssistantSalesRequestSchema = z
	.object({
		conversationId: z.string().min(1).max(191),
		requestId: z.string().uuid(),
		type: z.enum(["order", "quote"]),
		text: z
			.string()
			.min(1)
			.max(32_000)
			.refine((text) => text.trim().length > 0, "Request text is required"),
	})
	.strict();

export const answerAssistantSalesRequestSchema = z
	.object({
		conversationId: z.string().min(1).max(191),
		revision: z.number().int().positive(),
		answers: z
			.array(
				z
					.object({
						questionId: z.string().uuid(),
						answer: z.string().trim().min(1).max(2_000),
						reuse: z.boolean(),
					})
					.strict(),
			)
			.min(1)
			.max(300),
	})
	.strict();

type Preview = {
	generationId: string;
	seed: unknown;
	configurationScope: string;
	configurationRevision: string;
	promptVersion: string;
	provider: string;
	model: string;
	usage: { inputTokens?: number | null; outputTokens?: number | null };
	clarification: {
		sessionId: string;
		revision: number;
		questions: unknown;
	} | null;
};

const STALE_PROCESSING_MS = 15 * 60 * 1000;

export function assistantSalesRequestProcessingStopped(
	session: { status: string; updatedAt: Date },
	now = new Date(),
) {
	return (
		session.status === "processing" &&
		now.getTime() - session.updatedAt.getTime() > STALE_PROCESSING_MS
	);
}

async function requireConversation(
	db: Database,
	actor: AssistantToolActor,
	conversationId: string,
) {
	const conversation = await getAssistantConversation(db, {
		ownerUserId: actor.userId,
		scopeType: actor.scopeType,
		scopeId: actor.scopeId,
		conversationId,
		messageTake: 1,
	});
	if (!conversation || conversation.archivedAt)
		throw new TRPCError({ code: "NOT_FOUND" });
}

function modelSelection(session: { provider: string; model: string }) {
	return resolveAssistantRuntimeSelection({
		ASSISTANT_AI_PROVIDER: session.provider,
		ASSISTANT_AI_MODEL: session.model,
	});
}

function projectPreview(
	type: "order" | "quote",
	sourceText: string,
	result: Preview,
) {
	return assistantSalesRequestDraftPreviewSchema.parse({
		type,
		sourceText,
		generationId: result.generationId,
		seed: result.seed,
		configurationScope: result.configurationScope,
		configurationRevision: result.configurationRevision,
		promptVersion: result.promptVersion,
		provider: result.provider,
		model: result.model,
		usage: {
			inputTokens: result.usage.inputTokens ?? null,
			outputTokens: result.usage.outputTokens ?? null,
		},
		unresolvedCount: Array.isArray(
			(result.seed as { unresolved?: unknown[] }).unresolved,
		)
			? (result.seed as { unresolved: unknown[] }).unresolved.length
			: 0,
	});
}

export async function publishAssistantSalesRequestResult(
	db: Database,
	actor: AssistantToolActor,
	session: {
		id: string;
		conversationId: string;
		revision: number;
		saleType: string;
		sourceText: string;
	},
	preview: Preview,
	now = new Date(),
) {
	const type = session.saleType as "order" | "quote";
	const finalPreview = preview.clarification
		? null
		: projectPreview(type, session.sourceText, preview);
	const updated = await db.assistantSalesRequestSession.updateMany({
		where: {
			id: session.id,
			ownerUserId: actor.userId,
			revision: session.revision,
			status: "processing",
			updatedAt: { gte: new Date(now.getTime() - STALE_PROCESSING_MS) },
		},
		data: {
			status: preview.clarification ? "awaiting" : "ready",
			clarificationId: preview.clarification?.sessionId ?? null,
			revision: preview.clarification?.revision ?? session.revision,
			generationId: preview.generationId,
			finalPreview: (finalPreview as Prisma.InputJsonValue) ?? undefined,
			completedAt: finalPreview ? now : null,
		},
	});
	if (updated.count !== 1)
		throw new TRPCError({
			code: "CONFLICT",
			message: "Sales Request session changed. Reload the chat.",
		});
	return readAssistantSalesRequestSession(db, actor, session.conversationId);
}

export async function readAssistantSalesRequestSession(
	db: Database,
	actor: AssistantToolActor,
	conversationId: string,
) {
	await requireConversation(db, actor, conversationId);
	const session = await getAssistantSalesRequestSession(
		db,
		actor,
		conversationId,
	);
	if (!session) return null;
	const clarification =
		session.clarificationId && session.status === "awaiting"
			? await ownedClarification(
					db as unknown as ClarificationDatabase,
					session.clarificationId,
					actor.userId,
				)
			: null;
	const questions = clarification
		? z.array(questionSchema).parse(clarification.questions).map((question) =>
			isOrderSpecificClarificationField(question.field)
				? { ...question, canSaveRule: false }
				: question,
		)
		: [];
	const processingStopped = assistantSalesRequestProcessingStopped(session);
	const preview = session.finalPreview
		? assistantSalesRequestDraftPreviewSchema.parse(session.finalPreview)
		: null;
	const generationRun = session.status === "ready" && session.generationId && !preview?.savedSale
		? await db.salesRequestGenerationRun.findFirst({
				where: {
					generationId: session.generationId,
					actorUserId: actor.userId,
					consumedSalesId: { not: null },
					deletedAt: null,
				},
				select: { consumedSalesId: true },
			})
		: null;
	const savedSale = preview?.savedSale
		? await db.salesOrders.findFirst({
				where: {
					slug: preview.savedSale.slug,
					type: session.saleType,
					deletedAt: null,
				},
				select: { orderId: true, slug: true },
			})
		: generationRun?.consumedSalesId
		? await db.salesOrders.findFirst({
				where: {
					id: generationRun.consumedSalesId,
					type: session.saleType,
					deletedAt: null,
				},
				select: { orderId: true, slug: true },
			})
		: null;
	return {
		id: session.id,
		conversationId,
		type: session.saleType as "order" | "quote",
		status: processingStopped ? "failed" : session.status,
		revision: clarification?.revision ?? session.revision,
		questions,
		preview,
		savedSale,
		errorMessage: processingStopped
			? "This request stopped before its result could be confirmed. Start a new chat to retry safely."
			: session.errorMessage,
	};
}

export async function startAssistantSalesRequest(
	db: Database,
	actor: AssistantToolActor,
	input: z.infer<typeof startAssistantSalesRequestSchema>,
	signal: AbortSignal,
) {
	await requireConversation(db, actor, input.conversationId);
	const selection = (await getAssistantRuntimeConfiguration(db)).selection;
	const dependencies = createAssistantSalesRequestPreviewDependencies(
		actor,
		input,
		db,
		selection,
	);
	await dependencies.authorize();
	const created = await createAssistantSalesRequestSession(db, actor, {
		...input,
		selection,
	});
	if (!created.created) {
		if (
			created.session.sourceFingerprint !== created.fingerprint ||
			created.session.requestId !== input.requestId
		)
			throw new TRPCError({
				code: "CONFLICT",
				message:
					"This chat already has a different Sales Request. Start a new chat.",
			});
		return readAssistantSalesRequestSession(db, actor, input.conversationId);
	}
	try {
		await appendAssistantUserMessage(db, {
			ownerUserId: actor.userId,
			scopeType: actor.scopeType,
			scopeId: actor.scopeId,
			conversationId: input.conversationId,
			clientRequestId: `sales-request:${input.requestId}`,
			parts: [{ type: "text", text: input.text }],
		});
		const result = await beginSalesRequestClarification({
			db: db as unknown as ClarificationDatabase,
			actorUserId: actor.userId,
			type: input.type,
			text: input.text,
			signal,
			dependencies,
		});
		return publishAssistantSalesRequestResult(db, actor, created.session, result);
	} catch (error) {
		await db.assistantSalesRequestSession.updateMany({
			where: { id: created.session.id, status: "processing" },
			data: {
				status: "failed",
				errorMessage:
					"The Sales Request could not be completed. Start a new chat to retry safely.",
			},
		});
		throw error;
	}
}

export async function answerAssistantSalesRequest(
	db: Database,
	actor: AssistantToolActor,
	input: z.infer<typeof answerAssistantSalesRequestSchema>,
	signal: AbortSignal,
) {
	await requireConversation(db, actor, input.conversationId);
	const session = await getAssistantSalesRequestSession(
		db,
		actor,
		input.conversationId,
	);
	if (
		!session?.clarificationId ||
		session.status !== "awaiting" ||
		session.revision !== input.revision
	)
		throw new TRPCError({
			code: "CONFLICT",
			message: "Questions changed. Reload the chat before answering.",
		});
	const claim = await db.assistantSalesRequestSession.updateMany({
		where: { id: session.id, status: "awaiting", revision: input.revision },
		data: { status: "processing" },
	});
	if (claim.count !== 1)
		throw new TRPCError({
			code: "CONFLICT",
			message: "This answer is already processing.",
		});
	try {
		const currentRound = await ownedClarification(
			db as unknown as ClarificationDatabase,
			session.clarificationId,
			actor.userId,
		);
		const questionLabels = new Map(
			z
				.array(questionSchema)
				.parse(currentRound.questions)
				.map((question) => [question.id, question.question]),
		);
		const result = await answerSalesRequestClarification({
			db: db as unknown as ClarificationDatabase,
			actorUserId: actor.userId,
			sessionId: session.clarificationId,
			revision: input.revision,
			answers: input.answers,
			signal,
			dependencies: createAssistantSalesRequestPreviewDependencies(
				actor,
				{
					type: session.saleType as "order" | "quote",
					text: session.sourceText,
				},
				db,
				modelSelection(session),
			),
		});
		await appendAssistantUserMessage(db, {
			ownerUserId: actor.userId,
			scopeType: actor.scopeType,
			scopeId: actor.scopeId,
			conversationId: input.conversationId,
			clientRequestId: `sales-answer:${session.id}:${input.revision}`,
			parts: [
				{
					type: "text",
					text: input.answers
						.map(
							(answer) =>
								`${questionLabels.get(answer.questionId) ?? "Question"}: ${answer.answer}${answer.reuse ? " (saved as a rule)" : ""}`,
						)
						.join("\n"),
				},
			],
		});
		return publishAssistantSalesRequestResult(db, actor, session, result);
	} catch (error) {
		const clarification = await ownedClarification(
			db as unknown as ClarificationDatabase,
			session.clarificationId,
			actor.userId,
		).catch(() => null);
		const safeToRetry =
			clarification?.revision === input.revision &&
			clarification.status === "awaiting";
		await db.assistantSalesRequestSession.updateMany({
			where: { id: session.id, revision: input.revision, status: "processing" },
			data: safeToRetry
				? { status: "awaiting" }
				: {
						status: "failed",
						errorMessage:
							"The answer may have been processed, but the preview is unavailable. Start a new chat rather than submitting twice.",
					},
		});
		throw error;
	}
}
