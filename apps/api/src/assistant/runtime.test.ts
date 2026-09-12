import { describe, expect, test } from "bun:test";
import {
	ASSISTANT_MAX_SELECTED_TOOLS,
	createAssistantRuntime,
	getAssistantRuntimeIdentity,
	resolveAssistantRuntimeSelection,
	selectAssistantRuntimeTools,
} from "./runtime";

describe("assistant runtime", () => {
	test("accepts only configured provider and model allowlist pairs", () => {
		expect(
			resolveAssistantRuntimeSelection({
				ASSISTANT_AI_PROVIDER: "google",
				ASSISTANT_AI_MODEL: "gemini-2.5-flash",
			}),
		).toEqual({ provider: "google", model: "gemini-2.5-flash" });
		expect(() =>
			resolveAssistantRuntimeSelection({
				ASSISTANT_AI_PROVIDER: "openai",
				ASSISTANT_AI_MODEL: "gemini-2.5-flash",
			}),
		).toThrow("model is not supported");
		expect(
			getAssistantRuntimeIdentity({
				ASSISTANT_AI_PROVIDER: "openai",
				ASSISTANT_AI_MODEL: "gpt-5-mini",
			}),
		).toEqual({
			provider: "openai",
			model: "gpt-5-mini",
			modelIdentity: "openai:gpt-5-mini",
			catalogVersion: "assistant-catalog-v1",
			promptVersion: "gnd-assistant-prompt-v1",
		});
	});

	test("keeps deterministic and write workflows outside model discovery", () => {
		const entries = [
			...Array.from({ length: 20 }, (_, index) => ({
				name: `read_${String(index).padStart(2, "0")}`,
				kind: "discovery" as const,
				effect: "read" as const,
				tool: { index },
			})),
			{
				name: "orders_create",
				kind: "workflow" as const,
				effect: "write" as const,
				tool: {},
			},
		];

		const selected = selectAssistantRuntimeTools(entries);

		expect(Object.keys(selected)).toHaveLength(ASSISTANT_MAX_SELECTED_TOOLS);
		expect(selected.orders_create).toBeUndefined();
		expect(Object.keys(selected)).toEqual(
			Array.from(
				{ length: ASSISTANT_MAX_SELECTED_TOOLS },
				(_, index) => `read_${String(index).padStart(2, "0")}`,
			),
		);
	});

	test("streams text, reports bounded usage, and cleans up once", async () => {
		const chunks: unknown[] = [];
		let cleaned = 0;
		let settings: Record<string, unknown> | undefined;
		const runtime = createAssistantRuntime({
			selection: { provider: "openai", model: "gpt-5-mini" },
			createModel: () => ({}) as never,
			createAgent: (input) => {
				settings = input as unknown as Record<string, unknown>;
				return {
					stream: async () => ({
						textStream: (async function* () {
							yield "Order ";
							yield "found";
						})(),
						totalUsage: Promise.resolve({
							inputTokens: 18,
							outputTokens: 4,
							totalTokens: 22,
						}),
					}),
				};
			},
			cleanup: async () => {
				cleaned += 1;
			},
		});

		const result = await runtime.execute({
			actor: {
				userId: 42,
				scopeType: "organization",
				scopeId: "7",
				fullName: "Jordan Lee",
				teamName: "GND",
				locale: "en-US",
				timezone: "UTC",
				baseCurrency: "USD",
				dateFormat: null,
				timeFormat: 12,
				countryCode: "US",
			},
			modelMessages: [{ role: "user", content: "Find order 09502PC" }],
			recentUploads: [],
			mentionedIntegrations: [],
			writer: { write: (chunk) => chunks.push(chunk) },
			signal: new AbortController().signal,
		});

		expect(result).toEqual({
			status: "succeeded",
			assistantText: "Order found",
			usage: {
				inputTokens: 18,
				outputTokens: 4,
				totalTokens: 22,
				provider: "openai",
				model: "gpt-5-mini",
			},
		});
		expect(chunks).toEqual([
			{ type: "text-start", id: expect.any(String) },
			{ type: "text-delta", id: expect.any(String), delta: "Order " },
			{ type: "text-delta", id: expect.any(String), delta: "found" },
			{ type: "text-end", id: expect.any(String) },
		]);
		expect(settings?.maxOutputTokens).toBe(4_000);
		expect(settings?.maxRetries).toBe(1);
		const stopWhen = settings?.stopWhen as
			| ((input: { steps: unknown[] }) => boolean)
			| undefined;
		expect(stopWhen?.({ steps: Array.from({ length: 9 }) })).toBe(false);
		expect(stopWhen?.({ steps: Array.from({ length: 10 }) })).toBe(true);
		expect(cleaned).toBe(1);
	});

	test("aborts at the foreground deadline and still cleans up once", async () => {
		let cleaned = 0;
		const runtime = createAssistantRuntime({
			selection: { provider: "openai", model: "gpt-5-mini" },
			deadlineMs: 5,
			createModel: () => ({}) as never,
			createAgent: () => ({
				stream: async ({ abortSignal }) => {
					await new Promise<void>((_resolve, reject) => {
						abortSignal?.addEventListener("abort", () =>
							reject(abortSignal.reason),
						);
					});
					throw new Error("unreachable");
				},
			}),
			cleanup: async () => {
				cleaned += 1;
			},
		});

		const result = await runtime.execute({
			actor: {
				userId: 42,
				scopeType: "user",
				scopeId: "42",
				fullName: null,
				teamName: null,
				locale: "en-US",
				timezone: "UTC",
				baseCurrency: "USD",
				dateFormat: null,
				timeFormat: 24,
				countryCode: null,
			},
			modelMessages: [{ role: "user", content: "wait" }],
			recentUploads: [],
			mentionedIntegrations: [],
			writer: { write() {} },
			signal: new AbortController().signal,
		});

		expect(result.status).toBe("failed");
		expect(result.errorCode).toBe("ASSISTANT_FOREGROUND_DEADLINE");
		expect(cleaned).toBe(1);
	});

	test("redacts provider failures and still cleans up once", async () => {
		let cleaned = 0;
		const runtime = createAssistantRuntime({
			selection: { provider: "openai", model: "gpt-5-mini" },
			createModel: () => ({}) as never,
			createAgent: () => ({
				stream: async () => {
					throw new Error("customer secret and provider credential");
				},
			}),
			cleanup: async () => {
				cleaned += 1;
			},
		});

		const result = await runtime.execute({
			actor: {
				userId: 42,
				scopeType: "user",
				scopeId: "42",
				fullName: null,
				teamName: null,
				locale: "en-US",
				timezone: "UTC",
				baseCurrency: "USD",
				dateFormat: null,
				timeFormat: 24,
				countryCode: null,
			},
			modelMessages: [{ role: "user", content: "help" }],
			recentUploads: [],
			mentionedIntegrations: [],
			writer: { write() {} },
			signal: new AbortController().signal,
		});

		expect(result).toEqual({
			status: "failed",
			errorCode: "ASSISTANT_PROVIDER_FAILED",
			errorMessage: "Assistant runtime failed",
		});
		expect(JSON.stringify(result)).not.toContain("customer secret");
		expect(cleaned).toBe(1);
	});

	test("cleanup rejection cannot replace a successful result", async () => {
		const runtime = createAssistantRuntime({
			selection: { provider: "openai", model: "gpt-5-mini" },
			createModel: () => ({}) as never,
			createAgent: () => ({
				stream: async () => ({
					textStream: (async function* () {
						yield "Saved answer";
					})(),
					totalUsage: Promise.resolve({ totalTokens: 2 }),
				}),
			}),
			cleanup: async () => {
				throw new Error("private cleanup failure");
			},
		});

		const result = await runtime.execute({
			actor: {
				userId: 42,
				scopeType: "user",
				scopeId: "42",
				fullName: null,
				teamName: null,
				locale: "en-US",
				timezone: "UTC",
				baseCurrency: "USD",
				dateFormat: null,
				timeFormat: 24,
				countryCode: null,
			},
			modelMessages: [{ role: "user", content: "help" }],
			recentUploads: [],
			mentionedIntegrations: [],
			writer: { write() {} },
			signal: new AbortController().signal,
		});

		expect(result.status).toBe("succeeded");
		expect(result.assistantText).toBe("Saved answer");
	});
});
