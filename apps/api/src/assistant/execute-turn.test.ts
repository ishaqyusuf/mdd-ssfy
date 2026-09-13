import { describe, expect, test } from "bun:test";
import { NEW_SALES_FORM_SEED_EXAMPLE } from "@gnd/sales/sales-form-core";
import {
	executeAssistantConversationTurn,
	summarizeAssistantToolExecutionResult,
} from "./execute-turn";

const onePixelPng = new Uint8Array(
	Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
		"base64",
	),
);

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
	grants: {},
};

describe("executeAssistantConversationTurn", () => {
	test("projects failed tool callbacks without dereferencing a missing result", () => {
		expect(summarizeAssistantToolExecutionResult(undefined)).toBeUndefined();
		expect(
			summarizeAssistantToolExecutionResult({
				status: "success",
				sources: [{ id: "source-1" }, null],
				entities: [{ id: "order:1" }, { id: 2 }],
				warnings: ["One warning", 2],
			}),
		).toEqual({
			status: "success",
			sourceRefs: ["source-1"],
			recordRefs: ["order:1"],
			warnings: ["One warning"],
		});
	});
	test("passes authorized uploaded bytes through the model boundary", async () => {
		let receivedMessages: unknown;
		await executeAssistantConversationTurn(
			{
				actor,
				request: {
					conversationId: "conversation-1",
					requestId: "request-file",
					message: {
						id: "client-message-file",
						role: "user",
						parts: [
							{ type: "text", text: "Describe this image" },
							{ type: "file", documentId: "document-1" },
						],
					},
					mentionedIntegrationIds: [],
				},
				run: { runId: "run-file", triggerMessageId: "stored-message-file" },
				writer: { write() {} },
				signal: new AbortController().signal,
			},
			{
				loadHistory: async () => [
					{
						id: "stored-message-file",
						sequence: 1,
						role: "user",
						text: "Describe this image",
					},
				],
				loadDocuments: async () => [
					{
						id: "document-1",
						filename: "photo.png",
						mimeType: "image/png",
						description: null,
						url: "https://example.com/photo.png",
						pathname: "assistant/photo.png",
						size: onePixelPng.byteLength,
						provider: "vercel-blob",
						sourceType: "authenticated_browser_upload",
					},
				],
				loadDocumentBytes: async () => onePixelPng,
				executeRuntime: async (input) => {
					receivedMessages = input.modelMessages;
					return {
						status: "succeeded",
						assistantText: "A sample image.",
						usage: { totalTokens: 3 },
					};
				},
				persistAssistantMessage: async () => undefined,
			},
		);
		expect(receivedMessages).toEqual([
			{
				role: "user",
				content: [
					{ type: "text", text: "Describe this image" },
					{
						type: "image",
						image: onePixelPng,
						mediaType: "image/png",
					},
				],
			},
		]);
	});

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
					input.writer.write({
						type: "data-assistant-entity",
						id: "entity-1",
						data: { kind: "document", id: "doc:1", label: "Invoice" },
					});
					input.writer.write({
						type: "data-assistant-invalidation",
						id: "invalidation-1",
						data: { toolCallId: "call-1", tags: ["sales.orders"] },
					});
					input.writer.write({
						type: "data-assistant-order-draft",
						id: "order-draft-1",
						data: {
							type: "order",
							generationId: "88d3cb0f-32b9-4e3d-b5c3-1a1425374a83",
							seed: NEW_SALES_FORM_SEED_EXAMPLE,
							configurationScope: "sales-settings:1",
							configurationRevision: "catalog-revision-4",
							promptVersion: "sales-request-v4",
							provider: "openai",
							model: "gpt-5-mini",
							usage: { inputTokens: 120, outputTokens: 40 },
							unresolvedCount: NEW_SALES_FORM_SEED_EXAMPLE.unresolved.length,
						},
					});
					input.writer.write({
						type: "data-assistant-analytics",
						id: "analytics-1",
						data: {
							version: "assistant-analytics-result-v1",
							metric: "sales.revenueByPeriod",
							title: "Sales revenue by period",
							definition:
								"Current non-deleted order totals grouped by the actor's calendar period; currencies remain separate.",
							presentation: "area",
							rows: [{ label: "2026-09", value: 42500 }],
							dateRange: {
								from: "2026-09-01",
								to: "2026-09-30",
								timezone: "UTC",
							},
							unit: "currency",
							currency: "USD",
							freshness: {
								observedAt: "2026-09-13T12:00:00.000Z",
								label: "Live",
							},
							sources: [{ id: "sales-v1", label: "SalesOrders" }],
						},
					});
					input.writer.write({
						type: "data-assistant-entity",
						id: "unsafe",
						data: { kind: "app", id: "admin/secrets", label: "Unsafe" },
					});
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
			assistantParts: [
				{
					type: "data-assistant-entity",
					id: "entity-1",
					data: { kind: "document", id: "doc:1", label: "Invoice" },
				},
				{
					type: "data-assistant-invalidation",
					id: "invalidation-1",
					data: { toolCallId: "call-1", tags: ["sales.orders"] },
				},
				{
					type: "data-assistant-order-draft",
					id: "order-draft-1",
					data: {
						type: "order",
						generationId: "88d3cb0f-32b9-4e3d-b5c3-1a1425374a83",
						seed: NEW_SALES_FORM_SEED_EXAMPLE,
						configurationScope: "sales-settings:1",
						configurationRevision: "catalog-revision-4",
						promptVersion: "sales-request-v4",
						provider: "openai",
						model: "gpt-5-mini",
						usage: { inputTokens: 120, outputTokens: 40 },
						unresolvedCount: NEW_SALES_FORM_SEED_EXAMPLE.unresolved.length,
					},
				},
				{
					type: "data-assistant-analytics",
					id: "analytics-1",
					data: {
						version: "assistant-analytics-result-v1",
						metric: "sales.revenueByPeriod",
						title: "Sales revenue by period",
						definition:
							"Current non-deleted order totals grouped by the actor's calendar period; currencies remain separate.",
						presentation: "area",
						rows: [{ label: "2026-09", value: 42500 }],
						dateRange: {
							from: "2026-09-01",
							to: "2026-09-30",
							timezone: "UTC",
						},
						unit: "currency",
						currency: "USD",
						freshness: {
							observedAt: "2026-09-13T12:00:00.000Z",
							label: "Live",
						},
						sources: [{ id: "sales-v1", label: "SalesOrders" }],
					},
				},
			],
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

	test("aborts attachment download when preprocessing exceeds its deadline", async () => {
		let runtimeCalled = false;
		await expect(
			executeAssistantConversationTurn(
				{
					actor,
					request: {
						conversationId: "conversation-1",
						requestId: "request-timeout",
						message: {
							id: "client-message-timeout",
							role: "user",
							parts: [{ type: "file", documentId: "document-1" }],
						},
						mentionedIntegrationIds: [],
					},
					run: { runId: "run-timeout" },
					writer: { write() {} },
					signal: new AbortController().signal,
				},
				{
					preprocessingDeadlineMs: 5,
					loadHistory: async () => [],
					loadDocuments: async () => [
						{
							id: "document-1",
							filename: "slow.png",
							mimeType: "image/png",
							description: null,
							url: null,
							pathname: "assistant/slow.png",
							size: 10,
							provider: "vercel-blob",
							sourceType: "authenticated_browser_upload",
						},
					],
					loadDocumentBytes: ({ signal }) =>
						new Promise((_, reject) => {
							signal.addEventListener("abort", () => reject(signal.reason), {
								once: true,
							});
						}),
					executeRuntime: async () => {
						runtimeCalled = true;
						return {
							status: "succeeded",
							assistantText: "late",
							usage: {},
						};
					},
				},
			),
		).rejects.toThrow("preprocessing timed out");
		expect(runtimeCalled).toBe(false);
	});
});
