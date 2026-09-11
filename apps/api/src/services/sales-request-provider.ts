import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
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

export type SalesRequestProviderFailureDiagnostic = {
	stage: "provider-api" | "structured-output" | "aborted" | "unknown";
	statusCode?: number;
	retryable?: boolean;
	finishReason?: string;
	inputTokens?: number;
	outputTokens?: number;
};

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
	if (APICallError.isInstance(error)) {
		return {
			stage: "provider-api",
			...(error.statusCode !== undefined
				? { statusCode: error.statusCode }
				: {}),
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
			result = await generateText({
				model,
				output: Output.object({ schema: newSalesFormSeedV2Schema }),
				system: buildSalesRequestInstructions(input.configurationJson),
				messages: [{ role: "user", content }],
				abortSignal: input.signal,
				maxRetries: 1,
				maxOutputTokens: 12000,
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
