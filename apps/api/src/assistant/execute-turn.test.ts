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
	test("invalid saved provider settings are captured before loading history or starting the model", async () => {
		const captures: Array<{ error: unknown; context: unknown }> = [];
		let loads = 0;
		let executions = 0;
		await expect(executeAssistantConversationTurn({
			actor,
			request: { conversationId: "conversation-1", requestId: "request-config", message: { id: "message-1", role: "user", parts: [{ type: "text", text: "Hello" }] }, mentionedIntegrationIds: [] },
			run: { runId: "run-config", modelIdentity: "openai:invalid-private-model" },
			writer: { write() {} }, signal: new AbortController().signal,
		}, {
			loadHistory: async () => { loads++; return []; },
			loadDocuments: async () => { loads++; return []; },
			executeRuntime: async () => { executions++; return { status: "succeeded", assistantText: "unreachable", usage: {} }; },
			captureDiagnostic: async (error, context) => { captures.push({ error, context }); return { reference: "ERR-ABCDEFGHIJ", recorded: true }; },
		})).rejects.toMatchObject({ assistantOutcome: { kind: "temporary", reference: "ERR-ABCDEFGHIJ" } });
		expect(loads).toBe(0);
		expect(executions).toBe(0);
		expect(captures).toHaveLength(1);
		expect(captures[0]?.error).toBeInstanceOf(Error);
		expect(captures[0]?.context).toMatchObject({ stage: "provider", operation: "assistant.resolveProvider", runId: "run-config", durationMs: expect.any(Number) });
	});
	for (const scenario of [
		{ mime: "application/pdf", size: 17_000_000, provider: "openai:gpt-5-mini", outcome: "attachment-too-large", operation: "checkAttachments", downloads: 0 },
		{ mime: "text/plain", size: 10, provider: "openai:gpt-5-mini", outcome: "attachment-unsupported", operation: "checkAttachments", downloads: 0 },
		{ mime: "image/png", size: 10, provider: "deepseek:deepseek-flash", outcome: "image-unsupported", operation: "checkAttachments", downloads: 0 },
		{ mime: "application/pdf", size: 10, provider: "openai:gpt-5-mini", outcome: "attachment-unreadable", operation: "extractPdf", downloads: 1, errorName: "InvalidPDFException" },
		{ mime: "application/pdf", size: 10, provider: "openai:gpt-5-mini", outcome: "temporary", operation: "extractPdf", downloads: 1, errorName: "Error" },
		{ mime: "image/png", size: 10, provider: "openai:gpt-5-mini", outcome: "attachment-unreadable", operation: "prepareImage", downloads: 1, errorName: "Error", errorMessage: "Input buffer has corrupt header: private bytes" },
	]) {
		test(`attachment ${scenario.outcome} at ${scenario.operation} captures once without starting model`, async () => {
			let downloads = 0;
			let modelCalls = 0;
			const captures: Array<{ error: unknown; context: unknown }> = [];
			const original = Object.assign(new Error(scenario.errorMessage ?? "private decoder details"), { name: scenario.errorName ?? "Error" });
			await expect(executeAssistantConversationTurn({
				actor,
				request: { conversationId: "conversation-1", requestId: "request-attachment", message: { id: "message-1", role: "user", parts: [{ type: "file", documentId: "document-1" }] }, mentionedIntegrationIds: [] },
				run: { runId: "run-attachment", modelIdentity: scenario.provider },
				writer: { write() {} }, signal: new AbortController().signal,
			}, {
				loadHistory: async () => [],
				loadDocuments: async () => [{ id: "document-1", filename: "test", mimeType: scenario.mime, size: scenario.size, description: null, url: null, pathname: "assistant/test", provider: "vercel-blob", sourceType: "authenticated_browser_upload" }],
				loadDocumentBytes: async () => { downloads++; return onePixelPng; },
				extractPdf: async () => { throw original; },
				prepareImage: async () => { throw original; },
				captureDiagnostic: async (error, context) => { captures.push({ error, context }); return { reference: "ERR-ABCDEFGHIJ", recorded: true }; },
				executeRuntime: async () => { modelCalls++; return { status: "succeeded", assistantText: "unreachable", usage: {} }; },
			})).rejects.toMatchObject({ assistantOutcome: { kind: scenario.outcome, reference: "ERR-ABCDEFGHIJ" } });
			expect(downloads).toBe(scenario.downloads);
			expect(modelCalls).toBe(0);
			expect(captures).toHaveLength(1);
			expect(captures[0]?.context).toMatchObject({ stage: "attachment", operation: `assistant.${scenario.operation}`, outcome: scenario.outcome });
			if (scenario.errorName) {
				if (scenario.outcome === "temporary") expect(captures[0]?.error).toBe(original);
				else expect(captures[0]?.error).toMatchObject({ cause: original });
			}
		});
	}
	for (const { savedBeforeError, captureFails } of [{ savedBeforeError: false, captureFails: false }, { savedBeforeError: true, captureFails: false }, { savedBeforeError: false, captureFails: true }]) {
		test(`keeps the completed response when transcript save fails (commit observed: ${savedBeforeError}, capture fails: ${captureFails})`, async () => {
			let providerCalls = 0;
			let saveCalls = 0;
			let saved = false;
			const chunks: unknown[] = [];
			const captured: unknown[] = [];
			const original = new Error("private database password=secret");
			const result = await executeAssistantConversationTurn({
				actor,
				request: { conversationId: "conversation-1", requestId: "request-save", message: { id: "message-1", role: "user", parts: [{ type: "text", text: "Check order" }] }, mentionedIntegrationIds: [] },
				run: { runId: "run-save" }, writer: { write: chunk => chunks.push(chunk) }, signal: new AbortController().signal,
			}, {
				loadHistory: async () => [], loadDocuments: async () => [],
				executeRuntime: async ({ writer }) => {
					providerCalls++;
					writer.write({ type: "text-start", id: "reply" });
					writer.write({ type: "text-delta", id: "reply", delta: "Your order is ready." });
					writer.write({ type: "text-end", id: "reply" });
					return { status: "succeeded", assistantText: "Your order is ready.", usage: { totalTokens: 12 } };
				},
				persistAssistantMessage: async () => { saveCalls++; saved = savedBeforeError; throw original; },
				captureDiagnostic: async (error, context) => { captured.push({ error, context }); if (captureFails) throw new Error("diagnostic storage unavailable"); return { reference: "ERR-ABCDEFGHIJ", recorded: true }; },
			});
			expect(result).toEqual({ status: "succeeded", usage: { totalTokens: 12 }, committed: false });
			expect(providerCalls).toBe(1);
			expect(saveCalls).toBe(1);
			expect(saved).toBe(savedBeforeError);
			expect(chunks.at(-1)).toEqual({ type: "data-assistant-history-notice", id: "assistant-history-notice", data: { kind: "history-unconfirmed", ...(captureFails ? {} : { reference: "ERR-ABCDEFGHIJ" }) } });
			expect(JSON.stringify(chunks)).toContain("Your order is ready.");
			expect(JSON.stringify(chunks)).not.toContain("password");
			expect(captured).toHaveLength(1);
			expect(captured[0]).toMatchObject({ error: original, context: { stage: "history", operation: "assistant.saveReply", outcome: "history-unconfirmed" } });
		});
	}

	test("captures history load failure before wrapping and does not start the provider", async () => {
		const original = new Error("private database connection details");
		const captured: unknown[] = [];
		let runtimeCalled = false;
		await expect(executeAssistantConversationTurn({
			actor,
			request: { conversationId: "conversation-1", requestId: "request-history", message: { id: "message-1", role: "user", parts: [{ type: "text", text: "Hello" }] }, mentionedIntegrationIds: [] },
			run: { runId: "run-history" }, writer: { write() {} }, signal: new AbortController().signal,
		}, {
			loadHistory: async () => { throw original; }, loadDocuments: async () => [],
			captureDiagnostic: async (error, context) => { captured.push({ error, context }); return { reference: "ERR-ABCDEFGHIJ", recorded: true }; },
			executeRuntime: async () => { runtimeCalled = true; return { status: "failed", errorCode: "UNREACHABLE", errorMessage: "unreachable" }; },
		})).rejects.toMatchObject({ referenceId: "ERR-ABCDEFGHIJ", assistantOutcome: { kind: "temporary", reference: "ERR-ABCDEFGHIJ" } });
		expect(runtimeCalled).toBe(false);
		expect(captured).toHaveLength(1);
		expect(captured[0]).toMatchObject({ error: original, context: { stage: "history", operation: "assistant.loadHistory", conversationId: "conversation-1", runId: "run-history" } });
	});

	test("projects failed tool callbacks without dereferencing a missing result", () => {
		expect(summarizeAssistantToolExecutionResult(undefined)).toBeUndefined();
		expect(
			summarizeAssistantToolExecutionResult({
				status: "success",
				sources: [{ id: "source-1" }, null],
				entities: [{ id: "order:1" }, { id: 2 }],
				warnings: ["private SQL password=secret", 2],
			}),
		).toEqual({
			status: "success",
			sourceRefs: ["source-1"],
			recordRefs: ["order:1"],
			warningCount: 1,
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
						executionFacts: "sales_find_orders: complete",
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
						type: "data-assistant-document-action",
						id: "document-action-1",
						data: {
							toolId: "documents_generate_pdf",
							toolVersion: 1,
							label: "Generate invoice PDF",
							input: {
								orderNo: "09502PC",
								mode: "invoice",
								expectedRevision: "revision-7",
								forceRegenerate: false,
							},
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
			{ role: "system", content: "Private historical context for the preceding response. Use it only to interpret prior checks; never quote this note or its tool identifiers in your reply.\nsales_find_orders: complete" },
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
				{
					type: "data-assistant-document-action",
					id: "document-action-1",
					data: {
						toolId: "documents_generate_pdf",
						toolVersion: 1,
						label: "Generate invoice PDF",
						input: {
							orderNo: "09502PC",
							mode: "invoice",
							expectedRevision: "revision-7",
							forceRegenerate: false,
						},
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

	test("persists safe findings for partial-result reload and discards arbitrary fields", async () => {
		let saved: unknown;
		const finding = { type: "data-assistant-finding", id: "finding:order:QA-123", data: { kind: "order-status", orderNo: "QA-123", salesType: "order", status: "pending", observedAt: "2026-09-15T10:00:00.000Z" } };
		await executeAssistantConversationTurn({
			actor,
			request: { conversationId: "conversation-1", requestId: "request-partial", message: { id: "user-partial", role: "user", parts: [{ type: "text", text: "Check my order" }] }, mentionedIntegrationIds: [] },
			run: { runId: "run-partial", triggerMessageId: "user-partial" }, writer: { write() {} }, signal: new AbortController().signal,
		}, {
			loadHistory: async () => [], loadDocuments: async () => [],
			executeRuntime: async input => {
				input.writer.write(finding);
				input.writer.write({ ...finding, id: "bad", data: { ...finding.data, message: "private SQL" } });
				input.writer.write({ type: "data-assistant-outcome", id: "assistant-outcome", data: { kind: "partial" } });
				return { status: "succeeded", assistantText: "Here's what I found. I couldn't check everything yet.", usage: { totalTokens: 2 } };
			},
			persistAssistantMessage: async input => { saved = input.assistantParts; },
		});
		expect(saved).toEqual([finding, { type: "data-assistant-outcome", id: "assistant-outcome", data: { kind: "partial" } }]);
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

	test("persists one terminal tool fact and the safe failed outcome for reload", async () => {
		let saved: Record<string, unknown> | undefined;
		const result = await executeAssistantConversationTurn({
			actor,
			request: { conversationId: "conversation-1", requestId: "failed-request", message: { id: "message", role: "user", parts: [{ type: "text", text: "Check my order" }] }, mentionedIntegrationIds: [] },
			run: { runId: "failed-run" }, writer: { write() {} }, signal: new AbortController().signal,
		}, {
			loadHistory: async () => [], loadDocuments: async () => [],
			executeRuntime: async ({ writer }) => {
				for (const status of ["running", "failed"]) writer.write({ type: "data-assistant-tool", id: "tool-one", data: { id: "one", name: "sales_find_orders", status } });
				writer.write({ type: "data-assistant-outcome", id: "assistant-outcome", data: { kind: "temporary", reference: "ERR-ABCDEFGHIJ" } });
				return { status: "failed", errorCode: "ASSISTANT_PROVIDER_FAILED", errorMessage: "private error must not persist" };
			},
			persistAssistantMessage: async input => { saved = input; },
		});
		expect(result.status).toBe("failed");
		expect(saved).toMatchObject({ assistantText: "I couldn't check that right now. Please try again.", assistantParts: [
			{ type: "data-assistant-tool", id: "tool-one", data: { id: "one", name: "sales_find_orders", status: "failed" } },
			{ type: "data-assistant-outcome", id: "assistant-outcome", data: { kind: "temporary", reference: "ERR-ABCDEFGHIJ" } },
		] });
		expect(JSON.stringify(saved)).not.toContain("private error");
	});

	test("aborts attachment download when preprocessing exceeds its deadline", async () => {
		const captured: unknown[] = [];
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
					captureDiagnostic: async (error, context) => { captured.push({ error, context }); return { reference: "ERR-ABCDEFGHIJ", recorded: true }; },
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
		).rejects.toThrow("I couldn't check that right now.");
		expect(runtimeCalled).toBe(false);
		expect(captured).toHaveLength(1);
		expect(captured[0]).toMatchObject({ context: { stage: "attachment", operation: "assistant.downloadAttachment", runId: "run-timeout" } });
	});
});
