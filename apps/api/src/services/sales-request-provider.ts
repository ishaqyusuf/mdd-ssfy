import { createAnthropic } from "@ai-sdk/anthropic";
import {
	type DeepSeekLanguageModelOptions,
	createDeepSeek,
} from "@ai-sdk/deepseek";
import {
	type GoogleLanguageModelOptions,
	createGoogleGenerativeAI,
} from "@ai-sdk/google";
import {
	type OpenAILanguageModelResponsesOptions,
	createOpenAI,
} from "@ai-sdk/openai";
import { newSalesFormSeedV2Schema } from "@gnd/sales/sales-form-core";
import { buildSalesRequestInstructions } from "@gnd/sales/sales-form/request-generation";
import {
	type SalesRequestAIProvider,
	type SalesRequestAISelection,
	getSalesRequestAIProviderOption,
	salesRequestAISelectionSchema,
} from "@gnd/settings/sales-request-ai-catalog";
import {
	APICallError,
	type ModelMessage,
	NoObjectGeneratedError,
	Output,
	RetryError,
	generateText,
} from "ai";

export type SalesRequestProviderInput = {
	configurationJson: string;
	text: string;
	/** Loaded and authorized by the API storage boundary, never arbitrary URLs. */
	images: Array<{
		bytes: Uint8Array;
		mediaType: "image/jpeg" | "image/png" | "image/webp";
	}>;
	signal: AbortSignal;
};

export type SalesRequestProviderResult = {
	output: unknown;
	inputTokens?: number;
	outputTokens?: number;
	provider?: SalesRequestAIProvider;
	model?: string;
};

export type SalesRequestProvider = (
	input: SalesRequestProviderInput,
) => Promise<SalesRequestProviderResult>;

export const SALES_REQUEST_MAX_OUTPUT_TOKENS = 4_000;
export const SALES_REQUEST_DEFAULT_MAX_RETRIES = 1;
export const SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES = 0;

export function resolveSalesRequestProviderMaxRetries(maxRetries?: 0 | 1) {
	return maxRetries ?? SALES_REQUEST_DEFAULT_MAX_RETRIES;
}

type SalesRequestProviderRuntimeOptions = Record<
	string,
	Record<
		string,
		| string
		| number
		| boolean
		| null
		| Record<string, string | number | boolean | null>
	>
>;

export function getSalesRequestProviderRuntimeOptions(
	provider: SalesRequestAIProvider,
): SalesRequestProviderRuntimeOptions | undefined {
	if (provider === "deepseek") {
		return {
			deepseek: {
				thinking: { type: "disabled" },
			} satisfies DeepSeekLanguageModelOptions,
		};
	}
	if (provider === "google") {
		return {
			google: {
				// Gemini rejects parts of the native seed's union/null response schema.
				// Keep JSON mode and validate the returned object locally instead.
				structuredOutputs: false,
			} satisfies GoogleLanguageModelOptions,
		};
	}
	if (provider === "openai") {
		return {
			openai: {
				// The native seed intentionally contains optional and union fields.
				// OpenAI validates the response; local Zod remains authoritative.
				strictJsonSchema: false,
			} satisfies OpenAILanguageModelResponsesOptions,
		};
	}
	return undefined;
}

export type SalesRequestProviderFailureDiagnostic = {
	stage: "provider-api" | "structured-output" | "aborted" | "unknown";
	statusCode?: number;
	providerCode?: number;
	providerStatus?: string;
	retryable?: boolean;
	finishReason?: string;
	inputTokens?: number;
	outputTokens?: number;
};

const SAFE_PROVIDER_ERROR_STATUSES = new Set([
	"OK",
	"CANCELLED",
	"UNKNOWN",
	"INVALID_ARGUMENT",
	"DEADLINE_EXCEEDED",
	"NOT_FOUND",
	"ALREADY_EXISTS",
	"PERMISSION_DENIED",
	"RESOURCE_EXHAUSTED",
	"FAILED_PRECONDITION",
	"ABORTED",
	"OUT_OF_RANGE",
	"UNIMPLEMENTED",
	"INTERNAL",
	"UNAVAILABLE",
	"DATA_LOSS",
	"UNAUTHENTICATED",
]);

function getSafeProviderErrorIdentity(data: unknown, statusCode?: number) {
	if (typeof data !== "object" || data === null || !("error" in data)) {
		return {};
	}
	const providerError = data.error;
	if (typeof providerError !== "object" || providerError === null) return {};

	const code = "code" in providerError ? providerError.code : undefined;
	const status = "status" in providerError ? providerError.status : undefined;
	return {
		...(typeof code === "number" &&
		Number.isInteger(code) &&
		code >= 100 &&
		code <= 599 &&
		code === statusCode
			? { providerCode: code }
			: {}),
		...(typeof status === "string" && SAFE_PROVIDER_ERROR_STATUSES.has(status)
			? { providerStatus: status }
			: {}),
	};
}

export class SalesRequestProviderExecutionError extends Error {
	readonly diagnostic: SalesRequestProviderFailureDiagnostic;

	constructor(diagnostic: SalesRequestProviderFailureDiagnostic) {
		super("The AI provider operation failed.");
		this.name = "SalesRequestProviderExecutionError";
		this.diagnostic = diagnostic;
	}
}

function finiteToken(value: unknown) {
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

/** Keep only operational fields; never retain prompts, bodies, generated text, or credentials. */
export function classifySalesRequestProviderFailure(
	error: unknown,
): SalesRequestProviderFailureDiagnostic {
	if (RetryError.isInstance(error)) {
		return classifySalesRequestProviderFailure(error.lastError);
	}
	if (APICallError.isInstance(error)) {
		return {
			stage: "provider-api",
			...(error.statusCode !== undefined
				? { statusCode: error.statusCode }
				: {}),
			...getSafeProviderErrorIdentity(error.data, error.statusCode),
			retryable: error.isRetryable,
		};
	}
	if (NoObjectGeneratedError.isInstance(error)) {
		return {
			stage: "structured-output",
			...(error.finishReason ? { finishReason: error.finishReason } : {}),
			...(finiteToken(error.usage?.inputTokens) !== undefined
				? { inputTokens: finiteToken(error.usage?.inputTokens) }
				: {}),
			...(finiteToken(error.usage?.outputTokens) !== undefined
				? { outputTokens: finiteToken(error.usage?.outputTokens) }
				: {}),
		};
	}
	if (
		error instanceof DOMException &&
		(error.name === "AbortError" || error.name === "TimeoutError")
	) {
		return { stage: "aborted" };
	}
	return { stage: "unknown" };
}

export const SALES_REQUEST_AI_CREDENTIAL_ENV_BY_PROVIDER = {
	openai: "SALES_REQUEST_OPENAI_API_KEY",
	anthropic: "SALES_REQUEST_ANTHROPIC_API_KEY",
	deepseek: "SALES_REQUEST_DEEPSEEK_API_KEY",
	google: "SALES_REQUEST_GOOGLE_API_KEY",
} as const satisfies Record<SalesRequestAIProvider, string>;

type SalesRequestProviderEnvironment = Readonly<
	Record<string, string | undefined>
>;

export class SalesRequestProviderConfigurationError extends Error {
	readonly code = "SALES_REQUEST_PROVIDER_NOT_CONFIGURED";

	constructor(provider: SalesRequestAIProvider) {
		super(`The ${provider} sales request provider is not configured.`);
		this.name = "SalesRequestProviderConfigurationError";
	}
}

export function getSalesRequestProviderApiKey(
	provider: SalesRequestAIProvider,
	environment: SalesRequestProviderEnvironment = process.env,
): string {
	const environmentKey = SALES_REQUEST_AI_CREDENTIAL_ENV_BY_PROVIDER[provider];
	const apiKey = environment[environmentKey]?.trim();
	if (!apiKey) throw new SalesRequestProviderConfigurationError(provider);
	return apiKey;
}

function createProviderModel(
	selection: SalesRequestAISelection,
	apiKey: string,
) {
	switch (selection.provider) {
		case "openai":
			return createOpenAI({ apiKey })(selection.model);
		case "anthropic":
			return createAnthropic({ apiKey })(selection.model);
		case "deepseek":
			return createDeepSeek({ apiKey })(selection.model);
		case "google":
			return createGoogleGenerativeAI({ apiKey })(selection.model);
	}
}

export function createSalesRequestProvider(options: {
	selection: SalesRequestAISelection;
	environment?: SalesRequestProviderEnvironment;
	maxRetries?: 0 | 1;
	/** Test seam for proving bounded SDK execution without a network request. */
	generateTextImpl?: typeof generateText;
}): SalesRequestProvider {
	const selection = salesRequestAISelectionSchema.parse(options.selection);
	const providerOption = getSalesRequestAIProviderOption(selection.provider);
	const modelOption = providerOption.models.find(
		(candidate) => candidate.id === selection.model,
	);
	if (!modelOption) {
		throw new Error("The selected sales request AI model is not supported.");
	}
	const apiKey = getSalesRequestProviderApiKey(
		selection.provider,
		options.environment,
	);
	const model = createProviderModel(selection, apiKey);
	const maxRetries = resolveSalesRequestProviderMaxRetries(options.maxRetries);
	const runGenerateText = options.generateTextImpl ?? generateText;

	return async (input) => {
		if (input.images.length > 0 && !modelOption.supportsImages) {
			throw new Error(
				"The selected sales request AI model does not support image requests.",
			);
		}
		const content: Extract<ModelMessage, { role: "user" }>["content"] = [
			{
				type: "text",
				text: input.text || "Read the attached customer request.",
			},
			...input.images.map((image) => ({
				type: "image" as const,
				image: image.bytes,
				mediaType: image.mediaType,
			})),
		];
		let result: Awaited<ReturnType<typeof generateText>>;
		try {
			result = await runGenerateText({
				model,
				output: Output.object({ schema: newSalesFormSeedV2Schema }),
				system: buildSalesRequestInstructions(input.configurationJson, {
					hasImages: input.images.length > 0,
				}),
				messages: [{ role: "user", content }],
				abortSignal: input.signal,
				providerOptions: getSalesRequestProviderRuntimeOptions(
					selection.provider,
				),
				maxRetries,
				maxOutputTokens: SALES_REQUEST_MAX_OUTPUT_TOKENS,
			});
		} catch (error) {
			throw new SalesRequestProviderExecutionError(
				classifySalesRequestProviderFailure(error),
			);
		}

		return {
			output: result.output,
			inputTokens: result.usage.inputTokens,
			outputTokens: result.usage.outputTokens,
			provider: selection.provider,
			model: selection.model,
		};
	};
}
