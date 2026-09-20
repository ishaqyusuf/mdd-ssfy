import { expect, test } from "bun:test";
import {
	answerAssistantSalesRequestSchema,
	assistantSalesRequestProcessingStopped,
	publishAssistantSalesRequestResult,
	readAssistantSalesRequestSession,
} from "./sales-request-session";

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
		updatedAt: new Date("2026-09-19T11:44:59Z"),
		clarificationId: null, generationId: null, finalPreview: null,
		errorMessage: null, answers: [{ questionId: "prior", answer: "Known answer" }],
	};
	const db = {
		assistantConversation: { findFirst: async () => ({ messages: [], archivedAt: null }) },
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
