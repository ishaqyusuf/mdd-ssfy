import { describe, expect, test } from "bun:test";
import { executeAssistantConversationTurn } from "./execute-turn";

const actor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	fullName: "Jordan",
	teamName: "GND",
	locale: "en-US",
	timezone: "UTC",
	baseCurrency: "USD",
	dateFormat: null,
	timeFormat: 12 as const,
	countryCode: "US",
};

describe("executeAssistantConversationTurn", () => {
	test("uses durable two-turn history and persists the reply before success", async () => {
		const events: string[] = [];
		let receivedMessages: unknown;
		let persisted: Record<string, unknown> | undefined;
		const controller = new AbortController();
		const outcome = await executeAssistantConversationTurn(
			{
				actor,
				request: {
					conversationId: "conversation-1",
					requestId: "request-2",
					message: {
						id: "client-message-2",
						role: "user",
						parts: [{ type: "text", text: "And what is its status?" }],
					},
					mentionedIntegrationIds: [],
				},
				run: { runId: "run-2", triggerMessageId: "stored-message-3" },
				writer: { write() {} },
				signal: controller.signal,
			},
			{
				loadHistory: async () => [
					{
						id: "stored-message-1",
						sequence: 1,
						role: "user",
						text: "Find order 09502PC",
					},
					{
						id: "stored-message-2",
						sequence: 2,
						role: "assistant",
						text: "I found the order.",
					},
					{
						id: "stored-message-3",
						sequence: 3,
						role: "user",
						text: "And what is its status?",
					},
				],
				loadDocuments: async () => [],
				executeRuntime: async (input) => {
					events.push("runtime");
					receivedMessages = input.modelMessages;
					return {
						status: "succeeded",
						assistantText: "It is in Production.",
						usage: { totalTokens: 12 },
					};
				},
				persistAssistantMessage: async (input) => {
					events.push("persist");
					persisted = input;
					controller.abort();
				},
			},
		);

		expect(receivedMessages).toEqual([
			{ role: "user", content: "Find order 09502PC" },
			{ role: "assistant", content: "I found the order." },
			{ role: "user", content: "And what is its status?" },
		]);
		expect(persisted).toMatchObject({
			conversationId: "conversation-1",
			runId: "run-2",
			parentMessageId: "stored-message-3",
			assistantText: "It is in Production.",
		});
		expect(events).toEqual(["runtime", "persist"]);
		expect(outcome).toEqual({
			status: "succeeded",
			usage: { totalTokens: 12 },
			committed: true,
		});
	});

	test("does not persist when cancellation wins before commit", async () => {
		const controller = new AbortController();
		let persisted = false;
		const outcome = await executeAssistantConversationTurn(
			{
				actor,
				request: {
					conversationId: "conversation-1",
					requestId: "request-1",
					message: {
						id: "client-message-1",
						role: "user",
						parts: [{ type: "text", text: "Find order" }],
					},
					mentionedIntegrationIds: [],
				},
				run: { runId: "run-1", triggerMessageId: "stored-message-1" },
				writer: { write() {} },
				signal: controller.signal,
			},
			{
				loadHistory: async () => [],
				loadDocuments: async () => [],
				executeRuntime: async () => {
					controller.abort();
					return {
						status: "succeeded",
						assistantText: "late answer",
						usage: { totalTokens: 2 },
					};
				},
				persistAssistantMessage: async () => {
					persisted = true;
				},
			},
		);

		expect(outcome.status).toBe("cancelled");
		expect(persisted).toBe(false);
	});
});
