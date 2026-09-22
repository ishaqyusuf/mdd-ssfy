import {
	type ClarificationDatabase,
	answerSalesRequestClarification,
	beginSalesRequestClarification,
	clarificationQuestionAllowsOther,
	isOrderSpecificClarificationField,
	ownedClarification,
} from "@api/services/sales-request-clarification";
import { getSalesRequestConfigurationSnapshot } from "@api/db/queries/sales-request-configuration";
import { selectSalesRequestSettingId } from "@api/services/sales-request-preview";
import { salesRequestConfigurationCache } from "@gnd/cache/sales-request-configuration-cache";
import { projectSalesRequestPartialNativeSeed, verifySalesRequestNativeSeedCompatibility } from "@api/services/request-generation/native-compatibility";
import { SALES_REQUEST_PROMPT_VERSION } from "@gnd/sales/sales-form/request-generation";
import { type Database, Prisma } from "@gnd/db";
import {
	appendAssistantUserMessage,
	createAssistantSalesRequestSession,
	getAssistantConversation,
	getAssistantSalesRequestSession,
} from "@gnd/db/queries";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assistantSalesRequestDraftPreviewSchema } from "./order-draft-contract";
import type { AssistantSalesRequestDraftPreview } from "./order-draft-contract";
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
	stepId: z.number().int().optional(),
	allowOther: z.boolean().optional(),
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

export const continueAssistantSalesRequestSchema = z.object({
	conversationId: z.string().min(1).max(191),
	revision: z.number().int().positive(),
}).strict();

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
const ORPHAN_RECOVERY_DELAY_MS = 60_000;
const ORPHAN_ROUND_WINDOW_MS = 3 * 60_000;

/** A claimed generation belongs to the persisted chat, not the HTTP connection. */
export function salesRequestClaimedSignal(clientSignal: AbortSignal) {
	clientSignal.throwIfAborted();
	return AbortSignal.timeout(STALE_PROCESSING_MS - 30_000);
}

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
	let pendingPreview = preview.clarification &&
		Array.isArray((preview.seed as { lineItems?: unknown }).lineItems) &&
		(preview.seed as { lineItems: unknown[] }).lineItems.length > 0
		? projectPreview(type, session.sourceText, preview) : null;
	if (pendingPreview) {
		try {
			const dependencies = createAssistantSalesRequestPreviewDependencies(actor, { type }, db, modelSelection(preview));
			const snapshot = await dependencies.readSnapshot();
			if (snapshot.scope === preview.configurationScope &&
				snapshot.revision === preview.configurationRevision) {
				const seed = projectSalesRequestPartialNativeSeed(
					pendingPreview.seed, session.sourceText, snapshot.configurationJson);
				pendingPreview = assistantSalesRequestDraftPreviewSchema.parse({
					...pendingPreview, seed, unresolvedCount: seed.unresolved.length,
				});
			}
			const compatible = snapshot.scope === preview.configurationScope &&
				snapshot.revision === preview.configurationRevision &&
				await verifySalesRequestNativeSeedCompatibility(pendingPreview.seed, snapshot.configurationJson, true);
			if (!compatible || compatible.initializer !== "passed" || compatible.saveReopen !== "passed")
				pendingPreview = null;
		} catch {
			// An unavailable or incompatible catalog cannot expose a partial handoff.
			pendingPreview = null;
		}
	}
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
			pendingPreview: (pendingPreview as Prisma.InputJsonValue) ?? Prisma.DbNull,
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

async function recoverUnlinkedClarification(
	db: Database,
	actor: AssistantToolActor,
	session: NonNullable<Awaited<ReturnType<typeof getAssistantSalesRequestSession>>>,
) {
	if (session.status !== "processing" || session.clarificationId ||
		session.generationId ||
		Date.now() - session.updatedAt.getTime() < ORPHAN_RECOVERY_DELAY_MS)
		return session;

	const end = new Date(session.createdAt.getTime() + ORPHAN_ROUND_WINDOW_MS);
	const rounds = await db.salesRequestClarificationSession.findMany({
		where: {
			actorUserId: actor.userId, saleType: session.saleType,
			sourceText: session.sourceText, status: "awaiting", revision: 1,
			createdAt: { gte: session.createdAt, lte: end },
		},
		select: { id: true, scope: true, configurationRevision: true,
			revision: true, createdAt: true, questions: true },
		take: 2,
	});
	if (rounds.length !== 1 ||
		!z.array(questionSchema).safeParse(rounds[0]?.questions).success)
		return session;
	const round = rounds[0]!;
	const matchingChats = await db.assistantSalesRequestSession.findMany({
		where: {
			ownerUserId: actor.userId, scopeType: actor.scopeType,
			scopeId: actor.scopeId, sourceFingerprint: session.sourceFingerprint,
			saleType: session.saleType,
			createdAt: { gte: new Date(session.createdAt.getTime() - ORPHAN_ROUND_WINDOW_MS),
				lte: end },
		},
		select: { id: true }, take: 2,
	});
	if (matchingChats.length !== 1 || matchingChats[0]?.id !== session.id ||
		await db.assistantSalesRequestSession.findFirst({
			where: { clarificationId: round.id }, select: { id: true },
		}))
		return session;
	const runs = await db.salesRequestGenerationRun.findMany({
		where: {
			actorUserId: actor.userId, scope: round.scope,
			configurationRevision: round.configurationRevision,
			provider: session.provider, model: session.model,
			status: { in: ["succeeded", "provider-error"] },
			completedAt: { not: null },
			createdAt: { gte: session.createdAt, lte: round.createdAt },
		},
		select: { generationId: true }, take: 2,
	});
	if (runs.length !== 1) return session;
	await db.assistantSalesRequestSession.updateMany({
		where: {
			id: session.id, ownerUserId: actor.userId,
			scopeType: actor.scopeType, scopeId: actor.scopeId,
			revision: session.revision, status: "processing",
			clarificationId: null, generationId: null,
			updatedAt: session.updatedAt,
		},
		data: {
			status: "awaiting", revision: round.revision,
			clarificationId: round.id, generationId: runs[0]!.generationId,
			pendingPreview: Prisma.DbNull, errorMessage: null,
		},
	});
	return getAssistantSalesRequestSession(db, actor, session.conversationId);
}

export async function readAssistantSalesRequestSession(
	db: Database,
	actor: AssistantToolActor,
	conversationId: string,
) {
	await requireConversation(db, actor, conversationId);
	let session = await getAssistantSalesRequestSession(
		db,
		actor,
		conversationId,
	);
	if (!session) return null;
	session = await recoverUnlinkedClarification(db, actor, session);
	if (!session) return null;
	const clarification =
		session.clarificationId && session.status === "awaiting"
			? await ownedClarification(
					db as unknown as ClarificationDatabase,
					session.clarificationId,
					actor.userId,
				)
			: null;
	const storedQuestions = clarification
		? z.array(questionSchema).parse(clarification.questions) : [];
	let configuration: Awaited<ReturnType<typeof getSalesRequestConfigurationSnapshot>>["configuration"] | null = null;
	if (storedQuestions.some((question) => question.options?.length)) {
		const settings = await db.settings.findMany({
			where: { type: "sales-settings", deletedAt: null },
			select: { id: true },
		});
		configuration = (await getSalesRequestConfigurationSnapshot(db,
			{ settingId: selectSalesRequestSettingId(settings.map((setting) => setting.id)) },
			{ cache: salesRequestConfigurationCache })).configuration;
	}
	const questions = storedQuestions.map((question) => ({
		...question,
		allowOther: configuration
			? clarificationQuestionAllowsOther(question, configuration) : true,
		canSaveRule: isOrderSpecificClarificationField(question.field)
			? false : question.canSaveRule,
	}));
	const processingStopped = assistantSalesRequestProcessingStopped(session);
	const preview = session.finalPreview
		? assistantSalesRequestDraftPreviewSchema.parse(session.finalPreview)
		: null;
	const pendingPreview = session.status === "awaiting" && session.pendingPreview
		? assistantSalesRequestDraftPreviewSchema.safeParse(session.pendingPreview)
		: null;
	const partialRun = pendingPreview?.success && session.generationId === pendingPreview.data.generationId
		? await db.salesRequestGenerationRun.findFirst({
				where: {
					generationId: session.generationId,
					actorUserId: actor.userId,
					scope: pendingPreview.data.configurationScope,
					status: "succeeded", hasText: true,
					retentionUntil: { gt: new Date() },
					consumedSalesId: null, deletedAt: null,
				},
				select: { generationId: true },
			})
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
		canContinuePartial: !!(clarification && questions.length && partialRun && pendingPreview?.success &&
			(pendingPreview.data.seed.lineItems.length > 0 || pendingPreview.data.seed.unresolved.length > 0) &&
			pendingPreview.data.seed.unresolved.length + questions.length <= 300 &&
			questions.every((question) => question.field.trim().length > 0 &&
				question.field.length <= 128)),
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
	const processingSignal = salesRequestClaimedSignal(signal);
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
			signal: processingSignal,
			dependencies,
		});
		return await publishAssistantSalesRequestResult(db, actor, created.session, result);
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
	const processingSignal = salesRequestClaimedSignal(signal);
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
			signal: processingSignal,
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
		return await publishAssistantSalesRequestResult(db, actor, session, result);
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

/** Explicitly retain a compatible partial native draft for Sales review. */
export async function continueAssistantSalesRequest(
	db: Database,
	actor: AssistantToolActor,
	input: z.infer<typeof continueAssistantSalesRequestSchema>,
	now = new Date(),
) {
	await requireConversation(db, actor, input.conversationId);
	const session = await getAssistantSalesRequestSession(db, actor, input.conversationId);
	if (!session || session.status !== "awaiting" ||
		session.revision !== input.revision || !session.clarificationId) {
		throw new TRPCError({ code: "CONFLICT", message: "Questions changed. Reload the chat." });
	}
	const pending = assistantSalesRequestDraftPreviewSchema.safeParse(session.pendingPreview);
	if (!pending.success || (!pending.data.seed.lineItems.length && !pending.data.seed.unresolved.length) ||
		pending.data.type !== session.saleType ||
		pending.data.sourceText !== session.sourceText ||
		pending.data.generationId !== session.generationId ||
		pending.data.provider !== session.provider || pending.data.model !== session.model ||
		pending.data.promptVersion !== SALES_REQUEST_PROMPT_VERSION) {
		throw new TRPCError({ code: "CONFLICT", message: "A compatible partial draft is unavailable. Reload the chat." });
	}
	const clarification = await ownedClarification(
		db as unknown as ClarificationDatabase, session.clarificationId, actor.userId,
	);
	if (clarification.status !== "awaiting" || clarification.revision !== input.revision ||
		clarification.sourceText !== session.sourceText ||
		clarification.saleType !== session.saleType ||
		clarification.scope !== pending.data.configurationScope ||
		clarification.configurationRevision !== pending.data.configurationRevision) {
		throw new TRPCError({ code: "CONFLICT", message: "Questions changed. Reload the chat." });
	}
	const questions = z.array(questionSchema).parse(clarification.questions);
	if (!questions.length) {
		throw new TRPCError({ code: "CONFLICT", message: "There are no unanswered questions to review." });
	}
	if (pending.data.seed.unresolved.length + questions.length > 300 ||
		questions.some((question) => !question.field.trim() || question.field.length > 128)) {
		throw new TRPCError({ code: "CONFLICT", message: "This questionnaire needs Sales review before a partial draft can be opened." });
	}
	const dependencies = createAssistantSalesRequestPreviewDependencies(
		actor, { type: pending.data.type }, db, modelSelection(session),
	);
	await dependencies.authorize();
	const snapshot = await dependencies.readSnapshot();
	if (snapshot.scope !== pending.data.configurationScope ||
		snapshot.revision !== pending.data.configurationRevision) {
		throw new TRPCError({ code: "CONFLICT", message: "The Sales catalog changed. Generate a new draft." });
	}
	const compatibility = await verifySalesRequestNativeSeedCompatibility(
		pending.data.seed, snapshot.configurationJson, true,
	);
	if (compatibility.initializer !== "passed" || compatibility.saveReopen !== "passed") {
		throw new TRPCError({ code: "CONFLICT", message: "This partial draft cannot open in the Sales form. Continue reviewing the questions." });
	}
	const finalPreview = buildPartialSalesReviewPreview(pending.data, questions, session.sourceText);
	const finalCompatibility = await verifySalesRequestNativeSeedCompatibility(
		finalPreview.seed, snapshot.configurationJson, true,
	);
	if (finalCompatibility.initializer !== "passed" || finalCompatibility.saveReopen !== "passed") {
		throw new TRPCError({ code: "CONFLICT", message: "This partial draft cannot open in the Sales form. Continue reviewing the questions." });
	}
	await commitPartialSalesReview(db, actor, input, session, clarification, finalPreview, now);
	return readAssistantSalesRequestSession(db, actor, input.conversationId);
}

export function buildPartialSalesReviewPreview(
	pending: AssistantSalesRequestDraftPreview,
	questions: z.infer<typeof questionSchema>[],
	sourceText: string,
) {
	const existingReviews = pending.seed.unresolved;
	const retainedLineUids = new Set(pending.seed.lineItems.map((line) => line.uid));
	const reviews = questions.map((question) => ({
		lineUid: question.lineUid && retainedLineUids.has(question.lineUid)
			? question.lineUid : null,
		stepId: null,
		field: question.field,
		status: "unsupported" as const,
		reason: `Sales review required — unanswered: ${question.lineUid &&
			!retainedLineUids.has(question.lineUid) ? `${question.lineUid}: ` : ""}${question.question}${question.sourceText &&
			sourceText.toLowerCase().includes(question.sourceText.toLowerCase())
			? ` Source: “${question.sourceText}”.` : ""}`.slice(0, 2000),
	}));
	return assistantSalesRequestDraftPreviewSchema.parse({
		...pending,
		seed: { ...pending.seed, unresolved: [...existingReviews, ...reviews] },
		unresolvedCount: existingReviews.length + reviews.length,
	});
}

export async function commitPartialSalesReview(
	db: Database,
	actor: AssistantToolActor,
	input: z.infer<typeof continueAssistantSalesRequestSchema>,
	session: { id: string; generationId: string | null },
	clarification: { id: string },
	finalPreview: AssistantSalesRequestDraftPreview,
	now = new Date(),
) {
	await db.$transaction(async (transaction) => {
		const run = await transaction.salesRequestGenerationRun.findFirst({
			where: {
				generationId: finalPreview.generationId,
				actorUserId: actor.userId,
				scope: finalPreview.configurationScope,
				configurationRevision: finalPreview.configurationRevision,
				provider: finalPreview.provider,
				model: finalPreview.model,
				promptVersion: finalPreview.promptVersion,
				schemaVersion: finalPreview.seed.schemaVersion,
				status: "succeeded", hasText: true,
				seedDigest: { not: null }, completedAt: { not: null },
				retentionUntil: { gt: now }, consumedSalesId: null, deletedAt: null,
			},
			select: { generationId: true },
		});
		if (!run) throw new TRPCError({ code: "CONFLICT", message: "The generated draft is no longer available. Generate a new draft." });
		const ended = await transaction.salesRequestClarificationSession.updateMany({
			where: { id: clarification.id, actorUserId: actor.userId,
				revision: input.revision, status: "awaiting" },
			data: { status: "complete", revision: input.revision + 1 },
		});
		if (ended.count !== 1) throw new TRPCError({ code: "CONFLICT", message: "Questions changed. Reload the chat." });
		const promoted = await transaction.assistantSalesRequestSession.updateMany({
			where: { id: session.id, conversationId: input.conversationId,
				ownerUserId: actor.userId, scopeType: actor.scopeType, scopeId: actor.scopeId,
				clarificationId: clarification.id, generationId: session.generationId,
				revision: input.revision, status: "awaiting" },
			data: { status: "ready", revision: input.revision + 1,
				pendingPreview: Prisma.DbNull,
				finalPreview: finalPreview as Prisma.InputJsonValue, completedAt: now },
		});
		if (promoted.count !== 1) throw new TRPCError({ code: "CONFLICT", message: "Questions changed. Reload the chat." });
	});
}
