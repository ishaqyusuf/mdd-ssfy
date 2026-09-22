import { expect, test } from "bun:test";
import {
	answerAssistantSalesRequestSchema,
	assistantSalesRequestProcessingStopped,
	buildPartialSalesReviewPreview,
	commitPartialSalesReview,
	continueAssistantSalesRequest,
	continueAssistantSalesRequestSchema,
	publishAssistantSalesRequestResult,
	readAssistantSalesRequestSession,
	salesRequestClaimedSignal,
} from "./sales-request-session";

test("a claimed Sales Request survives its initiating browser connection closing", () => {
	const connection = new AbortController();
	const generation = salesRequestClaimedSignal(connection.signal);
	connection.abort();
	expect(generation.aborted).toBe(false);
	expect(() => salesRequestClaimedSignal(connection.signal)).toThrow();
});

const partialPreview = {
	type: "order" as const, sourceText: "Two simple doors; jamb dimensions unstated.",
	generationId: "11111111-1111-4111-8111-111111111111",
	seed: { schemaVersion: 2 as const,
		lineItems: [{ uid: "line-1", qty: 2,
			formSteps: [{ stepId: 1, prodUid: "simple-door" }] }],
		unresolved: [{ lineUid: null, stepId: null, field: "finish",
			status: "unsupported" as const, reason: "Check selected finish against source." }] },
	configurationScope: "sales-settings:1", configurationRevision: "revision-1",
	promptVersion: "v16", provider: "openai", model: "gpt",
	usage: { inputTokens: 12, outputTokens: 10 }, unresolvedCount: 1,
};

test("continuing a partial draft preserves every unanswered question as Sales review", () => {
	expect(continueAssistantSalesRequestSchema.safeParse({ conversationId: "chat", revision: 2 }).success).toBe(true);
	expect(continueAssistantSalesRequestSchema.safeParse({ conversationId: "chat", revision: 2, answers: [] }).success).toBe(false);
	const preview = buildPartialSalesReviewPreview(partialPreview, [
		{ id: "11111111-1111-4111-8111-111111111111", lineUid: "line-1",
			field: "jambSize", question: "Which jamb size?", reason: "Jamb is unstated.",
			sourceText: "jamb dimensions unstated" },
		{ id: "22222222-2222-4222-8222-222222222222", lineUid: null,
			field: "doorProduct", question: "Which door product?", reason: "Missing product.",
			sourceText: "Invented catalog title" },
	], partialPreview.sourceText);
	expect(preview.seed.lineItems).toEqual(partialPreview.seed.lineItems);
	expect(preview.seed.unresolved).toHaveLength(3);
	expect(preview.seed.unresolved[0]).toEqual(partialPreview.seed.unresolved[0]);
	expect(preview.seed.unresolved[1]).toMatchObject({ status: "unsupported", lineUid: "line-1",
		reason: expect.stringContaining("Source: “jamb dimensions unstated”") });
	expect(preview.seed.unresolved[2]?.reason).not.toContain("Invented catalog title");
	expect(preview.unresolvedCount).toBe(3);
	const omitted = buildPartialSalesReviewPreview(partialPreview, [{
		id: "33333333-3333-4333-8333-333333333333", lineUid: "omitted-door-line",
		field: "door", question: "Which Door product?", reason: "Missing Door.", sourceText: null,
	}], partialPreview.sourceText);
	expect(omitted.seed.unresolved[1]).toMatchObject({ lineUid: null,
		reason: expect.stringContaining("omitted-door-line: Which Door product?") });
});

test("an empty provider fallback clears any older pending draft and cannot offer continuation", async () => {
	const actor = { userId: 42, scopeType: "sales-settings", scopeId: "1" };
	const session = { id: "session-1", conversationId: "chat-1", ownerUserId: 42,
		scopeType: "sales-settings", scopeId: "1", revision: 2, saleType: "order",
		sourceText: "A door request", status: "processing", updatedAt: new Date(),
		pendingPreview: partialPreview, finalPreview: null, clarificationId: null,
		generationId: null, errorMessage: null };
	const db = {
		assistantConversation: { findFirst: async () => ({ messages: [], archivedAt: null }) },
		salesRequestGenerationRun: { findFirst: async () => null },
		assistantSalesRequestSession: {
			findFirst: async () => session,
			updateMany: async ({ data }: { data: Record<string, unknown> }) => {
				expect(data).toMatchObject({ status: "awaiting", pendingPreview: expect.anything() });
				Object.assign(session, data);
				return { count: 1 };
			},
		},
		salesRequestClarificationSession: { findUnique: async () => ({
			id: "clarification-1", actorUserId: 42, status: "awaiting", revision: 3,
			questions: [{ id: "11111111-1111-4111-8111-111111111111", lineUid: null,
				field: "door", question: "Which door?", sourceText: null, reason: "Door unspecified." }],
		}) },
	};
	const result = await publishAssistantSalesRequestResult(
		db as never, actor as never,
		{ id: session.id, conversationId: session.conversationId, revision: 2,
			saleType: "order", sourceText: session.sourceText },
		{ generationId: partialPreview.generationId,
			seed: { schemaVersion: 2, lineItems: [], unresolved: [{ lineUid: null,
				stepId: null, field: "door", status: "ambiguous", reason: "Which door?" }] },
			configurationScope: "sales-settings:1", configurationRevision: "revision-1",
			promptVersion: "v16", provider: "openai", model: "gpt", usage: {},
			clarification: { sessionId: "clarification-1", revision: 3, questions: [] } },
	);
	expect(result?.status).toBe("awaiting");
	expect(result?.canContinuePartial).toBe(false);
	expect(result?.preview).toBeNull();
});

test("a foreign conversation cannot reach partial promotion or provider work", async () => {
	const db = {
		assistantConversation: { findFirst: async ({ where }: { where: Record<string, unknown> }) => {
			expect(where).toMatchObject({ ownerUserId: 42, scopeType: "sales-settings",
				scopeId: "1", id: "foreign-chat" });
			return null;
		} },
		assistantSalesRequestSession: { findFirst: async () => {
			throw new Error("A foreign session should never be read");
		} },
	};
	await expect(continueAssistantSalesRequest(db as never,
		{ userId: 42, scopeType: "sales-settings", scopeId: "1" } as never,
		{ conversationId: "foreign-chat", revision: 2 },
	)).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("an owned awaiting questionnaire exposes only the partial availability flag", async () => {
	let runAvailable = true;
	const db = {
		assistantConversation: { findFirst: async () => ({ messages: [], archivedAt: null }) },
		salesRequestGenerationRun: { findFirst: async ({ where }: { where: Record<string, unknown> }) => {
			expect(where).toMatchObject({ generationId: partialPreview.generationId,
				actorUserId: 42, status: "succeeded", consumedSalesId: null });
			return runAvailable ? { generationId: partialPreview.generationId } : null;
		} },
		assistantSalesRequestSession: { findFirst: async () => ({
			id: "session-1", status: "awaiting", saleType: "order", revision: 2,
			generationId: partialPreview.generationId,
			clarificationId: "clarification-1", pendingPreview: partialPreview,
			finalPreview: null, updatedAt: new Date(), errorMessage: null,
		}) },
		salesRequestClarificationSession: { findUnique: async () => ({
			id: "clarification-1", actorUserId: 42, revision: 2,
			questions: [{ id: "11111111-1111-4111-8111-111111111111", lineUid: "line-1",
				field: "jambSize", question: "Which jamb size?", sourceText: null,
				reason: "Not provided." }],
		}) },
	};
	const result = await readAssistantSalesRequestSession(db as never,
		{ userId: 42, scopeType: "sales-settings", scopeId: "1" } as never, "chat-1");
	expect(result?.canContinuePartial).toBe(true);
	expect(result?.preview).toBeNull();
	expect(result).not.toHaveProperty("pendingPreview");
	expect(JSON.stringify(result)).not.toContain("simple-door");
	runAvailable = false;
	expect((await readAssistantSalesRequestSession(db as never,
		{ userId: 42, scopeType: "sales-settings", scopeId: "1" } as never, "chat-1"))?.canContinuePartial).toBe(false);
});

test("partial promotion fences the generation and rolls both states back on a stale session", async () => {
	const now = new Date("2026-09-20T12:00:00Z");
	const actor = { userId: 42, scopeType: "sales-settings", scopeId: "1" };
	const input = { conversationId: "chat-1", revision: 2 };
	const session = { id: "session-1", generationId: partialPreview.generationId };
	const clarification = { id: "clarification-1" };
	const preview = buildPartialSalesReviewPreview(partialPreview, [{
		id: "11111111-1111-4111-8111-111111111111", lineUid: "line-1",
		field: "jambSize", question: "Which jamb size?", reason: "Missing jamb.", sourceText: null,
	}], partialPreview.sourceText);
	for (const scenario of ["missing-run", "stale-clarification", "stale-session", "success"]) {
		let clarificationStatus = "awaiting";
		let sessionStatus = "awaiting";
		const db = { $transaction: async (execute: (transaction: unknown) => Promise<void>) => {
			const prior = [clarificationStatus, sessionStatus];
			try {
				await execute({
					salesRequestGenerationRun: { findFirst: async ({ where }: { where: Record<string, unknown> }) => {
						expect(where).toMatchObject({ generationId: partialPreview.generationId,
							actorUserId: 42, scope: "sales-settings:1", status: "succeeded",
							seedDigest: { not: null }, consumedSalesId: null,
							retentionUntil: { gt: now } });
						return scenario === "missing-run" ? null : { generationId: where.generationId };
					} },
					salesRequestClarificationSession: { updateMany: async ({ where, data }: {
						where: Record<string, unknown>; data: Record<string, unknown>
					}) => {
						expect(where).toMatchObject({ id: "clarification-1", actorUserId: 42,
							revision: 2, status: "awaiting" });
						if (scenario === "stale-clarification") return { count: 0 };
						clarificationStatus = data.status;
						return { count: 1 };
					} },
					assistantSalesRequestSession: { updateMany: async ({ where, data }: {
						where: Record<string, unknown>; data: Record<string, unknown>
					}) => {
						expect(where).toMatchObject({ id: "session-1", ownerUserId: 42,
							scopeType: "sales-settings", scopeId: "1", revision: 2,
							generationId: partialPreview.generationId, status: "awaiting" });
						if (scenario === "stale-session") return { count: 0 };
						expect((data.finalPreview as typeof preview).seed.unresolved)
						.toHaveLength(2);
						sessionStatus = data.status;
						return { count: 1 };
					} },
				} as never);
			} catch (error) {
				[clarificationStatus, sessionStatus] = prior;
				throw error;
			}
		} };
		if (scenario === "success") await commitPartialSalesReview(
			db as never, actor as never, input, session, clarification, preview, now);
		else await expect(commitPartialSalesReview(
			db as never, actor as never, input, session, clarification, preview, now,
		)).rejects.toMatchObject({ code: "CONFLICT" });
		expect([clarificationStatus, sessionStatus]).toEqual(
			scenario === "success" ? ["complete", "ready"] : ["awaiting", "awaiting"],
		);
	}
});

test("an older door configuration question no longer offers a rule on chat reload", async () => {
	const actor = { userId: 7, scopeType: "sales-settings", scopeId: "1" };
	const db = {
		assistantConversation: { findFirst: async () => ({ messages: [], archivedAt: null }) },
		assistantSalesRequestSession: { findFirst: async () => ({
			id: "session", clarificationId: "clarification", status: "awaiting",
			revision: 1, saleType: "order", finalPreview: null,
			updatedAt: new Date(), errorMessage: null,
		}) },
		salesRequestClarificationSession: { findUnique: async () => ({
			id: "clarification", actorUserId: 7, revision: 1,
			questions: [{
				id: "00000000-0000-4000-8000-000000000001", lineUid: "line-1",
				field: "doorConfiguration", question: "Select a compatible configuration.",
				sourceText: "PH - Single", reason: "The route is incompatible.",
				canSaveRule: true,
			}],
		}) },
	};
	const result = await readAssistantSalesRequestSession(db as never, actor as never, "chat-1");
	expect(result?.questions[0]?.canSaveRule).toBe(false);
});

test("a dense questionnaire can submit every answer through the Assistant contract", () => {
	const input = {
		conversationId: "chat-1",
		revision: 1,
		answers: Array.from({ length: 44 }, (_, index) => ({
			questionId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
			answer: `Customer answer ${index + 1}`,
			reuse: false,
		})),
	};
	expect(answerAssistantSalesRequestSchema.safeParse(input).success).toBe(true);
	expect(answerAssistantSalesRequestSchema.safeParse({
		...input,
		answers: Array.from({ length: 301 }, (_, index) => ({
			questionId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
			answer: "Customer answer",
			reuse: false,
		})),
	}).success).toBe(false);
});

test("an interrupted Sales Request stops presenting an endless processing state", () => {
	const now = new Date("2026-09-19T12:00:00Z");
	expect(
		assistantSalesRequestProcessingStopped(
			{ status: "processing", updatedAt: new Date("2026-09-19T11:45:00Z") },
			now,
		),
	).toBe(false);
	expect(
		assistantSalesRequestProcessingStopped(
			{ status: "processing", updatedAt: new Date("2026-09-19T11:44:59Z") },
			now,
		),
	).toBe(true);
	expect(
		assistantSalesRequestProcessingStopped(
			{ status: "ready", updatedAt: new Date("2026-09-19T11:00:00Z") },
			now,
		),
	).toBe(false);
});

test("a late result cannot publish after the processing recovery boundary", async () => {
	const now = new Date("2026-09-19T12:00:00Z");
	const stored = {
		id: "session-1", conversationId: "chat-1", ownerUserId: 42,
		scopeType: "sales-settings", scopeId: "1", saleType: "order",
		sourceText: "Body-only request", status: "processing", revision: 2,
		createdAt: new Date("2026-09-19T11:44:59Z"),
		updatedAt: new Date("2026-09-19T11:44:59Z"),
		clarificationId: null, generationId: null, finalPreview: null,
		errorMessage: null, answers: [{ questionId: "prior", answer: "Known answer" }],
	};
	const db = {
		assistantConversation: { findFirst: async () => ({ messages: [], archivedAt: null }) },
		salesRequestClarificationSession: { findMany: async () => [] },
		assistantSalesRequestSession: {
			findFirst: async () => stored,
			updateMany: async ({ where, data }: { where: Record<string, any>; data: Record<string, unknown> }) => {
				expect(where).toMatchObject({
					id: "session-1", ownerUserId: 42, revision: 2, status: "processing",
					updatedAt: { gte: new Date("2026-09-19T11:45:00Z") },
				});
				if (stored.updatedAt < where.updatedAt.gte) return { count: 0 };
				Object.assign(stored, data);
				return { count: 1 };
			},
		},
	};
	await expect(publishAssistantSalesRequestResult(
		db as never,
		{ userId: 42 } as never,
		{ id: "session-1", conversationId: "chat-1", revision: 2,
			saleType: "order", sourceText: "Body-only request" },
		{ generationId: "generation-1", seed: {}, configurationScope: "sales-settings:1",
			configurationRevision: "revision-1", promptVersion: "v1", provider: "openai",
			model: "gpt", usage: {}, clarification: {
				sessionId: "clarification-1", revision: 3, questions: [],
			} },
		now,
	)).rejects.toMatchObject({ code: "CONFLICT" });
	expect(stored).toMatchObject({
		status: "processing", revision: 2, sourceText: "Body-only request",
		generationId: null, finalPreview: null,
		answers: [{ questionId: "prior", answer: "Known answer" }],
	});
	const reloaded = await readAssistantSalesRequestSession(db as never,
		{ userId: 42, scopeType: "sales-settings", scopeId: "1" } as never, "chat-1");
	expect(reloaded).toMatchObject({
		status: "failed", preview: null,
		errorMessage: "This request stopped before its result could be confirmed. Start a new chat to retry safely.",
	});
});

test("a captured result cannot publish after its session fails or advances", async () => {
	const now = new Date("2026-09-20T12:00:00Z");
	for (const changed of [
		{ status: "failed", revision: 2 },
		{ status: "processing", revision: 3 },
	]) {
		const stored = {
			id: "session-1", conversationId: "chat-1", ownerUserId: 42,
			scopeType: "sales-settings", scopeId: "1", saleType: "order",
			sourceText: "Body-only request", status: "processing", revision: 2,
			updatedAt: now, clarificationId: null, generationId: null,
			finalPreview: null, answers: [{ questionId: "prior", answer: "Known answer" }],
		};
		const captured = {
			id: stored.id, conversationId: stored.conversationId,
			revision: stored.revision, saleType: stored.saleType,
			sourceText: stored.sourceText,
		};
		const db = {
			assistantSalesRequestSession: {
				updateMany: async ({ where, data }: {
					where: { id: string; ownerUserId: number; revision: number;
						status: string; updatedAt: { gte: Date } };
					data: Record<string, unknown>;
				}) => {
					const matches = stored.id === where.id &&
						stored.ownerUserId === where.ownerUserId &&
						stored.revision === where.revision &&
						stored.status === where.status &&
						stored.updatedAt >= where.updatedAt.gte;
					if (!matches) return { count: 0 };
					Object.assign(stored, data);
					return { count: 1 };
				},
			},
		};
		Object.assign(stored, changed);
		await expect(publishAssistantSalesRequestResult(
			db as never, { userId: 42 } as never, captured,
			{ generationId: "late-generation", seed: {},
				configurationScope: "sales-settings:1", configurationRevision: "revision-1",
				promptVersion: "v1", provider: "openai", model: "gpt", usage: {},
				clarification: { sessionId: "late-clarification", revision: 3, questions: [] } },
			now,
		)).rejects.toMatchObject({ code: "CONFLICT" });
		expect(stored).toMatchObject({
			...changed, sourceText: "Body-only request", generationId: null,
			clarificationId: null, finalPreview: null,
			answers: [{ questionId: "prior", answer: "Known answer" }],
		});
	}
});
