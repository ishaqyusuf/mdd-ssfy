import { describe, expect, test } from "bun:test";
import { SALES_REQUEST_AI_PROVIDER_CATALOG } from "@gnd/settings/sales-request-ai-catalog";
import { APICallError } from "ai";
import {
	SALES_REQUEST_AI_CREDENTIAL_ENV_BY_PROVIDER,
	SalesRequestProviderConfigurationError,
	SalesRequestProviderExecutionError,
	classifySalesRequestProviderFailure,
	createSalesRequestProvider,
	getSalesRequestProviderApiKey,
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
	test("classifies API failures without retaining request or response bodies", () => {
		const error = new APICallError({
			message: "secret upstream message",
			url: "https://api.deepseek.com/chat/completions",
			requestBodyValues: { customerText: "private request" },
			statusCode: 429,
			responseBody: "private upstream body",
			isRetryable: true,
		});
		const diagnostic = classifySalesRequestProviderFailure(error);

		expect(diagnostic).toEqual({
			stage: "provider-api",
			statusCode: 429,
			retryable: true,
		});
		expect(JSON.stringify(diagnostic)).not.toContain("private");
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
