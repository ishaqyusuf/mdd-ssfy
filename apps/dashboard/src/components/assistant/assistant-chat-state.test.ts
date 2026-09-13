import { describe, expect, test } from "bun:test";
import {
	assistantScrollBehavior,
	buildAssistantChatRequest,
	getAssistantIntegrationIdsForMessage,
	getAssistantRequestId,
	initialAssistantStreamState,
	parseAssistantRequestLimit,
	persistedMessagesToUi,
	reduceAssistantData,
	rotateAssistantRequestId,
	shouldStickToAssistantBottom,
	shouldSubmitAssistantComposerKey,
} from "./assistant-chat-state";

describe("assistant chat state", () => {
	test("uses instant scrolling when reduced motion is requested", () => {
		expect(assistantScrollBehavior(true)).toBe("auto");
		expect(assistantScrollBehavior(false)).toBe("smooth");
	});
	test("sticks near the bottom without pulling back a user reading history", () => {
		expect(
			shouldStickToAssistantBottom({
				scrollHeight: 1_000,
				scrollTop: 420,
				clientHeight: 500,
			}),
		).toBe(true);
		expect(
			shouldStickToAssistantBottom({
				scrollHeight: 1_000,
				scrollTop: 100,
				clientHeight: 500,
			}),
		).toBe(false);
	});
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

	test("rotates request identity for an explicit retry", () => {
		const requestIds = new Map<string, string>();
		const first = getAssistantRequestId(requestIds, "message-1");
		const retry = rotateAssistantRequestId(requestIds, "message-1");
		expect(retry).not.toBe(first);
		expect(getAssistantRequestId(requestIds, "message-1")).toBe(retry);
	});

	test("reuses one request identity for retries of the same user message", () => {
		const requestIds = new Map<string, string>();
		const first = getAssistantRequestId(requestIds, "message-1");
		expect(getAssistantRequestId(requestIds, "message-1")).toBe(first);
		expect(getAssistantRequestId(requestIds, "message-2")).not.toBe(first);
	});

	test("submits Enter while preserving Shift+Enter and IME composition", () => {
		expect(
			shouldSubmitAssistantComposerKey({
				key: "Enter",
				shiftKey: false,
				isComposing: false,
			}),
		).toBe(true);
		expect(
			shouldSubmitAssistantComposerKey({
				key: "Enter",
				shiftKey: true,
				isComposing: false,
			}),
		).toBe(false);
		expect(
			shouldSubmitAssistantComposerKey({
				key: "Enter",
				shiftKey: false,
				isComposing: true,
			}),
		).toBe(false);
	});

	test("reuses the connector context captured by the original message", () => {
		const integrations = new Map<string, string[]>();
		expect(
			getAssistantIntegrationIdsForMessage(integrations, "message-1", [
				"quickbooks",
			]),
		).toEqual(["quickbooks"]);
		expect(
			getAssistantIntegrationIdsForMessage(integrations, "message-1", []),
		).toEqual(["quickbooks"]);
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

	test("keeps bounded safe source links from stream data", () => {
		const state = reduceAssistantData(initialAssistantStreamState, {
			type: "data-source",
			data: {
				id: "web-1",
				label: "Current source",
				url: "https://example.com/source",
			},
		});
		expect(state.sources).toEqual([
			{
				id: "web-1",
				label: "Current source",
				url: "https://example.com/source",
			},
		]);
		expect(
			reduceAssistantData(state, {
				type: "data-run",
				data: { runId: "run-next", status: "running" },
			}).sources,
		).toEqual([]);
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
