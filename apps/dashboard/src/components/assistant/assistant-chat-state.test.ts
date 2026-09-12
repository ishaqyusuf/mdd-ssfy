import { describe, expect, test } from "bun:test";
import {
	buildAssistantChatRequest,
	initialAssistantStreamState,
	parseAssistantRequestLimit,
	persistedMessagesToUi,
	reduceAssistantData,
} from "./assistant-chat-state";

describe("assistant chat state", () => {
	test("maps only the latest user message to the protected contract", () => {
		const request = buildAssistantChatRequest("chat-1", [
			{ id: "old", role: "user", parts: [{ type: "text", text: "old" }] },
			{
				id: "answer",
				role: "assistant",
				parts: [{ type: "text", text: "answer" }],
			},
			{ id: "new", role: "user", parts: [{ type: "text", text: "latest" }] },
		]);
		expect(request.conversationId).toBe("chat-1");
		expect(request.message).toEqual({
			id: "new",
			role: "user",
			parts: [{ type: "text", text: "latest" }],
		});
		expect(request.requestId.length > 0).toBe(true);
	});

	test("reduces title, limits, run cursors, warnings and terminal state", () => {
		let state = reduceAssistantData(initialAssistantStreamState, {
			type: "data-title",
			data: { title: "Order status" },
		});
		state = reduceAssistantData(state, {
			type: "data-rate-limit",
			data: { limit: 100, remaining: 99, resetAt: "later" },
		});
		state = reduceAssistantData(state, {
			type: "data-run",
			data: { runId: "run-1", status: "running" },
		});
		state = reduceAssistantData(state, {
			type: "data-sequence",
			data: { messageSequence: 2, runSequence: 4 },
		});
		state = reduceAssistantData(state, {
			type: "data-terminal-status",
			data: { status: "succeeded" },
		});
		expect({
			title: state.title,
			runId: state.runId,
			status: state.status,
			messageSequence: state.messageSequence,
			runSequence: state.runSequence,
			remaining: state.rateLimit?.remaining,
		}).toEqual({
			title: "Order status",
			runId: "run-1",
			status: "succeeded",
			messageSequence: 2,
			runSequence: 4,
			remaining: 99,
		});
	});

	test("hydrates durable user and assistant messages", () => {
		const messages = persistedMessagesToUi([
			{ id: "1", role: "system", parts: [] },
			{ id: "2", role: "assistant", parts: [{ type: "text", text: "Ready" }] },
		]);
		expect(messages).toEqual([
			{ id: "2", role: "assistant", parts: [{ type: "text", text: "Ready" }] },
		]);
	});

	test("parses a request limit response only when quota fields are complete", () => {
		expect(
			parseAssistantRequestLimit({
				limit: 100,
				remaining: 0,
				resetAt: "2026-09-13T12:00:00.000Z",
			}),
		).toEqual({
			limit: 100,
			remaining: 0,
			resetAt: "2026-09-13T12:00:00.000Z",
		});
		expect(parseAssistantRequestLimit({ limit: 100 })).toBe(null);
	});
});
