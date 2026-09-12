import { describe, expect, test } from "bun:test";
import { SALES_REQUEST_AI_PROVIDER_CATALOG } from "@gnd/settings/sales-request-ai-catalog";
import { APICallError, RetryError, type generateText } from "ai";
import {
	SALES_REQUEST_AI_CREDENTIAL_ENV_BY_PROVIDER,
	SALES_REQUEST_DEFAULT_MAX_RETRIES,
	SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
	SALES_REQUEST_MAX_OUTPUT_TOKENS,
	SalesRequestProviderConfigurationError,
	SalesRequestProviderExecutionError,
	classifySalesRequestProviderFailure,
	createSalesRequestProvider,
	getSalesRequestProviderApiKey,
	getSalesRequestProviderRuntimeOptions,
	resolveSalesRequestProviderMaxRetries,
} from "./sales-request-provider";

const credentials = {
	SALES_REQUEST_OPENAI_API_KEY: "openai-secret",
	SALES_REQUEST_ANTHROPIC_API_KEY: "anthropic-secret",
	SALES_REQUEST_DEEPSEEK_API_KEY: "deepseek-secret",
	SALES_REQUEST_GOOGLE_API_KEY: "google-secret",
};

describe("sales request provider credentials", () => {
	test.each([
		["openai", "SALES_REQUEST_OPENAI_API_KEY", "openai-secret"],
		["anthropic", "SALES_REQUEST_ANTHROPIC_API_KEY", "anthropic-secret"],
		["deepseek", "SALES_REQUEST_DEEPSEEK_API_KEY", "deepseek-secret"],
		["google", "SALES_REQUEST_GOOGLE_API_KEY", "google-secret"],
	] as const)(
		"maps %s to its isolated server credential",
		(provider, environmentKey, expected) => {
			expect(SALES_REQUEST_AI_CREDENTIAL_ENV_BY_PROVIDER[provider]).toBe(
				environmentKey,
			);
			expect(getSalesRequestProviderApiKey(provider, credentials)).toBe(
				expected,
			);
		},
	);

	test("requires only the selected provider credential", () => {
		expect(
			getSalesRequestProviderApiKey("anthropic", {
				SALES_REQUEST_ANTHROPIC_API_KEY: " anthropic-only ",
			}),
		).toBe("anthropic-only");
	});

	test("rejects a missing credential without exposing environment contents", () => {
		let error: unknown;
		try {
			getSalesRequestProviderApiKey("deepseek", {
				SALES_REQUEST_OPENAI_API_KEY: "must-not-leak",
			});
		} catch (cause) {
			error = cause;
		}

		expect(error).toBeInstanceOf(SalesRequestProviderConfigurationError);
		expect(String(error)).not.toContain("must-not-leak");
	});
});

describe("sales request provider factory", () => {
	test("uses bounded non-thinking extraction for DeepSeek only", () => {
		expect(SALES_REQUEST_DEFAULT_MAX_RETRIES).toBe(1);
		expect(SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES).toBe(0);
		expect(resolveSalesRequestProviderMaxRetries()).toBe(1);
		expect(resolveSalesRequestProviderMaxRetries(0)).toBe(0);
		expect(SALES_REQUEST_MAX_OUTPUT_TOKENS).toBe(4_000);
		expect(getSalesRequestProviderRuntimeOptions("deepseek")).toEqual({
			deepseek: { thinking: { type: "disabled" } },
		});
		expect(getSalesRequestProviderRuntimeOptions("google")).toEqual({
			google: { structuredOutputs: false },
		});
		expect(getSalesRequestProviderRuntimeOptions("openai")).toEqual({
			openai: { strictJsonSchema: false },
		});
	});

	test("forwards the live-evaluation zero-retry policy to the AI SDK call", async () => {
		let receivedMaxRetries: number | undefined;
		const provider = createSalesRequestProvider({
			selection: { provider: "deepseek", model: "deepseek-v4-flash" },
			environment: credentials,
			maxRetries: SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
			generateTextImpl: (async (options: { maxRetries?: number }) => {
				receivedMaxRetries = options.maxRetries;
				return {
					output: { schemaVersion: 2, lineItems: [], unresolved: [] },
					usage: { inputTokens: 1, outputTokens: 1 },
				};
			}) as typeof generateText,
		});

		await provider({
			configurationJson: JSON.stringify({
				schemaVersion: 1,
				routes: [],
				steps: [],
				visibilityByComponentUid: {},
			}),
			text: "unsupported request",
			images: [],
			signal: new AbortController().signal,
		});

		expect(receivedMaxRetries).toBe(0);
	});

	test("classifies API failures without retaining request or response bodies", () => {
		const error = new APICallError({
			message: "secret upstream message",
			url: "https://api.deepseek.com/chat/completions",
			requestBodyValues: { customerText: "private request" },
			statusCode: 429,
			responseBody: "private upstream body",
			data: {
				error: {
					code: 429,
					status: "RESOURCE_EXHAUSTED",
					message: "private provider detail",
				},
			},
			isRetryable: true,
		});
		const diagnostic = classifySalesRequestProviderFailure(error);

		expect(diagnostic).toEqual({
			stage: "provider-api",
			statusCode: 429,
			providerCode: 429,
			providerStatus: "RESOURCE_EXHAUSTED",
			retryable: true,
		});
		expect(JSON.stringify(diagnostic)).not.toContain("private");
	});

	test("drops malformed or message-like provider error identity", () => {
		const error = new APICallError({
			message: "secret upstream message",
			url: "https://generativelanguage.googleapis.com/v1beta/models/test",
			requestBodyValues: { customerText: "private request" },
			statusCode: 400,
			data: {
				error: {
					code: "400",
					status: "INVALID_ARGUMENT: private detail",
					message: "private provider detail",
				},
			},
			isRetryable: false,
		});

		expect(classifySalesRequestProviderFailure(error)).toEqual({
			stage: "provider-api",
			statusCode: 400,
			retryable: false,
		});
	});

	test("drops a provider code that does not match the HTTP status", () => {
		const error = new APICallError({
			message: "secret upstream message",
			url: "https://generativelanguage.googleapis.com/v1beta/models/test",
			requestBodyValues: { customerText: "private request" },
			statusCode: 400,
			data: {
				error: {
					code: 401,
					status: "INVALID_ARGUMENT",
					message: "private provider detail",
				},
			},
			isRetryable: false,
		});

		expect(classifySalesRequestProviderFailure(error)).toEqual({
			stage: "provider-api",
			statusCode: 400,
			providerStatus: "INVALID_ARGUMENT",
			retryable: false,
		});
	});

	test("classifies only the last provider failure from an exhausted retry", () => {
		const providerError = new APICallError({
			message: "secret upstream message",
			url: "https://generativelanguage.googleapis.com/v1beta/models/test",
			requestBodyValues: { customerText: "private request" },
			statusCode: 503,
			data: {
				error: {
					code: 503,
					status: "UNAVAILABLE",
					message: "private provider detail",
				},
			},
			isRetryable: true,
		});
		const error = new RetryError({
			message: "private retry summary",
			reason: "maxRetriesExceeded",
			errors: [new Error("private first failure"), providerError],
		});

		expect(classifySalesRequestProviderFailure(error)).toEqual({
			stage: "provider-api",
			statusCode: 503,
			providerCode: 503,
			providerStatus: "UNAVAILABLE",
			retryable: true,
		});
	});

	test("provider execution errors expose only the safe diagnostic", () => {
		const error = new SalesRequestProviderExecutionError({ stage: "unknown" });
		expect(error.message).toBe("The AI provider operation failed.");
		expect(error.diagnostic).toEqual({ stage: "unknown" });
	});

	test.each(
		SALES_REQUEST_AI_PROVIDER_CATALOG.map(
			({ id, defaultModel }) => [id, defaultModel] as const,
		),
	)("creates the allowlisted %s adapter", (provider, model) => {
		expect(
			createSalesRequestProvider({
				selection: { provider, model },
				environment: credentials,
			}),
		).toBeFunction();
	});

	test("rejects a model outside the provider allowlist", () => {
		expect(() =>
			createSalesRequestProvider({
				selection: { provider: "openai", model: "arbitrary-model" },
				environment: credentials,
			}),
		).toThrow("not allowed");
	});

	test("blocks image input for a text-only configured model before any API call", async () => {
		const textOnlyProvider = SALES_REQUEST_AI_PROVIDER_CATALOG.find((entry) =>
			entry.models.some((model) => !model.supportsImages),
		);
		const textOnlyModel = textOnlyProvider?.models.find(
			(model) => !model.supportsImages,
		);
		if (!textOnlyProvider || !textOnlyModel) {
			throw new Error(
				"The provider catalog must retain a text-only test model",
			);
		}
		const provider = createSalesRequestProvider({
			selection: {
				provider: textOnlyProvider.id,
				model: textOnlyModel.id,
			},
			environment: credentials,
		});

		await expect(
			provider({
				configurationJson: "{}",
				text: "one door",
				images: [
					{
						bytes: new Uint8Array([1, 2, 3]),
						mediaType: "image/jpeg",
					},
				],
				signal: new AbortController().signal,
			}),
		).rejects.toThrow("does not support image requests");
	});
});
