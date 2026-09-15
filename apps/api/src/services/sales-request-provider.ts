import {
	buildSalesRequestContext,
	salesRequestGroundingText,
	type SalesRequestGenerationContext,
} from "./sales-request-context";
import { normalizeSalesRequestProviderEnvelope } from "./sales-request-provider-envelope";
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
import {
	newSalesFormSeedSchema,
	newSalesFormSeedV2Schema,
} from "@gnd/sales/sales-form-core";
import { buildSalesRequestInstructions } from "@gnd/sales/sales-form/request-generation";
import {
	type SalesRequestAIProvider,
	type SalesRequestAISelection,
	getSalesRequestAIProviderOption,
	salesRequestAISelectionSchema,
} from "@gnd/settings/sales-request-ai-catalog";
import {
	APICallError,
	JSONParseError,
	type ModelMessage,
	NoObjectGeneratedError,
	Output,
	RetryError,
	TypeValidationError,
	generateText,
} from "ai";
import { z } from "zod";

export type SalesRequestProviderInput = SalesRequestGenerationContext & {
	configurationJson: string;
	text: string;
	/** Local validation closure; decoded source remains in the generation service. */
	prepareSeed?: (seed: z.infer<typeof newSalesFormSeedSchema>) => z.infer<typeof newSalesFormSeedSchema>;
	validateSeed?: (seed: z.infer<typeof newSalesFormSeedSchema>) => void;
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

export type SalesRequestEvaluationProviderCapture = {
	status: "returned" | "invalid-structured-output";
	text: string | null;
	inputTokens: number | null;
	outputTokens: number | null;
	finishReason: string | null;
};

type SalesRequestEvaluationCaptureSink = (
	capture: SalesRequestEvaluationProviderCapture,
) => Promise<void>;

async function captureSalesRequestEvaluationResponse(
	sink: SalesRequestEvaluationCaptureSink,
	capture: SalesRequestEvaluationProviderCapture,
) {
	try {
		await sink(capture);
	} catch {
		throw new SalesRequestProviderExecutionError({ stage: "unknown" });
	}
}

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
	structuredOutputCause?: "json-parse" | "schema-validation";
	schemaIssues?: Array<{
		code: string;
		path: string;
	}>;
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

const SAFE_SCHEMA_ISSUE_CODES = new Set([
	"custom",
	"invalid_element",
	"invalid_format",
	"invalid_key",
	"invalid_type",
	"invalid_union",
	"invalid_value",
	"not_multiple_of",
	"too_big",
	"too_small",
	"unrecognized_keys",
]);

const SAFE_SCHEMA_PATH_SEGMENTS = new Set([
	"amount",
	"calculation",
	"deliveryOption",
	"dimension",
	"doors",
	"extraCosts",
	"field",
	"form",
	"formSteps",
	"housePackageTool",
	"id",
	"label",
	"lhQty",
	"lineItems",
	"lineUid",
	"linearFeet",
	"meta",
	"mouldingRows",
	"pieceLength",
	"prodUid",
	"qty",
	"reason",
	"rhQty",
	"schemaVersion",
	"selectedProdUids",
	"service",
	"serviceRows",
	"status",
	"stepId",
	"swing",
	"totalQty",
	"type",
	"uid",
	"unresolved",
	"value",
	"wastePercentage",
]);

function safeSchemaIssues(error: unknown) {
	if (
		typeof error !== "object" ||
		error === null ||
		!("issues" in error) ||
		!Array.isArray(error.issues)
	) {
		return undefined;
	}
	const seen = new Set<string>();
	const issues: Array<{ code: string; path: string }> = [];
	for (const issue of error.issues) {
		if (typeof issue !== "object" || issue === null) continue;
		const code = "code" in issue ? issue.code : undefined;
		const rawPath = "path" in issue ? issue.path : undefined;
		if (
			typeof code !== "string" ||
			!SAFE_SCHEMA_ISSUE_CODES.has(code) ||
			!Array.isArray(rawPath)
		) {
			continue;
		}
		const path =
			rawPath.length === 0
				? "$"
				: rawPath
						.map((segment) =>
							typeof segment === "number"
								? "[]"
								: typeof segment === "string" &&
										SAFE_SCHEMA_PATH_SEGMENTS.has(segment)
									? segment
									: "<field>",
						)
						.join(".");
		const key = `${code}:${path}`;
		if (seen.has(key)) continue;
		seen.add(key);
		issues.push({ code, path });
		if (issues.length === 12) break;
	}
	return issues.length > 0 ? issues : undefined;
}

function structuredOutputCauseDiagnostic(error: NoObjectGeneratedError) {
	if (JSONParseError.isInstance(error.cause)) {
		return { structuredOutputCause: "json-parse" as const };
	}
	if (TypeValidationError.isInstance(error.cause)) {
		return {
			structuredOutputCause: "schema-validation" as const,
			...(() => {
				const schemaIssues = safeSchemaIssues(error.cause.cause);
				return schemaIssues ? { schemaIssues } : {};
			})(),
		};
	}
	return {};
}

/** Keep only operational fields; never retain prompts, bodies, generated text, or credentials. */
export function classifySalesRequestProviderFailure(
	error: unknown,
): SalesRequestProviderFailureDiagnostic {
	if (error instanceof SalesRequestProviderExecutionError) {
		return error.diagnostic;
	}
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
			...structuredOutputCauseDiagnostic(error),
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

const deepSeekJsonObjectSchema = z.record(z.string(), z.unknown());

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
	/** Manual-preview-only correction; evaluation defaults to no output repairs. */
	maxOutputRepairs?: 0 | 1;
	/** Trusted native validation, sharing the same correction budget as shape checks. */
	validateSeed?: (
		seed: z.infer<typeof newSalesFormSeedSchema>,
		input: SalesRequestProviderInput,
	) => void;
	/** Test seam for proving bounded SDK execution without a network request. */
	generateTextImpl?: typeof generateText;
	/** Evaluation-only sink that must durably archive a billed response before return/throw. */
	onEvaluationCapture?: SalesRequestEvaluationCaptureSink;
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

	const execute = async (
		input: SalesRequestProviderInput,
		repair?: {
			text: string;
			feedback: string;
			inputTokens: number;
			outputTokens: number;
		},
	): Promise<SalesRequestProviderResult> => {
		input.signal.throwIfAborted();
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
			...(input.clarifications?.length
				? [
						{
							type: "text" as const,
							text: `The representative has now supplied the missing details below. These are confirmed updates to the request above. Resolve these fields; ask only about information still missing.\n${salesRequestGroundingText(input.text, input.clarifications).slice(input.text.length)}\nQuestion/answer context: ${JSON.stringify(input.clarifications)}`,
						},
					]
				: []),
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
				output: Output.object({
					// DeepSeek's adapter serializes this schema into the request. The
					// application prompt already carries the output contract, so keep its
					// response format generic and enforce the strict seed schema below.
					schema:
						selection.provider === "deepseek"
							? deepSeekJsonObjectSchema
							: newSalesFormSeedV2Schema,
				}),
				system: [
					buildSalesRequestContext(input),
					buildSalesRequestInstructions(input.configurationJson, {
						hasImages: input.images.length > 0,
					}),
					...(selection.provider === "deepseek"
						? [
								"OUTPUT CONTRACT",
								JSON.stringify(z.toJSONSchema(newSalesFormSeedV2Schema)),
							]
						: []),
				].join("\n"),
				messages: [
					{ role: "user", content },
					...(repair
						? [
								{ role: "assistant" as const, content: repair.text },
								{
									role: "user" as const,
									content: `Correct the previous JSON once. Validation errors: ${repair.feedback}. Return the complete seed JSON. Preserve every source quantity and dimension; never invent facts to satisfy validation. Use unresolved status only ambiguous, unreadable, or unsupported. Omit empty optional arrays. Output contract: ${JSON.stringify(z.toJSONSchema(newSalesFormSeedV2Schema))}`,
								},
							]
						: []),
				],
				abortSignal: input.signal,
				providerOptions: getSalesRequestProviderRuntimeOptions(
					selection.provider,
				),
				maxRetries,
				maxOutputTokens: SALES_REQUEST_MAX_OUTPUT_TOKENS,
			});
		} catch (error) {
			if (
				options.onEvaluationCapture &&
				NoObjectGeneratedError.isInstance(error)
			) {
				await captureSalesRequestEvaluationResponse(
					options.onEvaluationCapture,
					{
						status: "invalid-structured-output",
						text: error.text ?? null,
						inputTokens: error.usage?.inputTokens ?? null,
						outputTokens: error.usage?.outputTokens ?? null,
						finishReason: error.finishReason ?? null,
					},
				);
			}
			throw new SalesRequestProviderExecutionError(
				classifySalesRequestProviderFailure(error),
			);
		}

		const totalInputTokens = repair
			? repair.inputTokens + (result.usage.inputTokens ?? 0)
			: result.usage.inputTokens;
		const totalOutputTokens = repair
			? repair.outputTokens + (result.usage.outputTokens ?? 0)
			: result.usage.outputTokens;
		let output: unknown;
		try {
			output = result.output;
		} catch {
			if (options.onEvaluationCapture) {
				await captureSalesRequestEvaluationResponse(
					options.onEvaluationCapture,
					{
						status: "invalid-structured-output",
						text: result.text || null,
						inputTokens: result.usage.inputTokens ?? null,
						outputTokens: result.usage.outputTokens ?? null,
						finishReason: result.finishReason ?? null,
					},
				);
			}
			throw new SalesRequestProviderExecutionError({
				stage: "structured-output",
				finishReason: result.finishReason,
				inputTokens: totalInputTokens,
				outputTokens: totalOutputTokens,
			});
		}
		if (selection.provider === "deepseek") {
			const configuration = JSON.parse(input.configurationJson) as {
				steps?: Array<{ id: number; selectionMode?: string }>;
			};
			const multipleStepIds = new Set(
				(configuration.steps || [])
					.filter((step) => step.selectionMode === "multiple")
					.map((step) => step.id),
			);
			const shape = newSalesFormSeedV2Schema.safeParse(
				normalizeSalesRequestProviderEnvelope(output, multipleStepIds),
			);
			const parsed = shape.success
				? newSalesFormSeedSchema.safeParse(input.prepareSeed ? input.prepareSeed(shape.data) : shape.data)
				: shape;
			let configurationError: string | undefined;
			if (parsed.success && (input.validateSeed || options.validateSeed)) {
				try {
					if (input.validateSeed) input.validateSeed(parsed.data);
					else options.validateSeed?.(parsed.data, input);
				} catch (error) {
					configurationError =
						error instanceof Error
							? error.message
							: "Native seed validation failed";
				}
			}
			if (!parsed.success || configurationError) {
				const schemaIssues = parsed.success
					? [{ code: "configuration-validation", path: "seed" }]
					: safeSchemaIssues(parsed.error);
				if (options.onEvaluationCapture) {
					await captureSalesRequestEvaluationResponse(
						options.onEvaluationCapture,
						{
							status: "invalid-structured-output",
							text: result.text || null,
							inputTokens: result.usage.inputTokens ?? null,
							outputTokens: result.usage.outputTokens ?? null,
							finishReason: result.finishReason ?? null,
						},
					);
				}
				if (
					options.maxOutputRepairs === 1 &&
					!repair &&
					result.text &&
					!input.signal.aborted
				) {
					return execute(input, {
						text: result.text,
						feedback:
							configurationError ||
							JSON.stringify(
								(!parsed.success ? parsed.error.issues : []).map(
									({ path, message }) => ({
										path,
										message,
									}),
								),
							),
						inputTokens: result.usage.inputTokens ?? 0,
						outputTokens: result.usage.outputTokens ?? 0,
					});
				}
				throw new SalesRequestProviderExecutionError({
					stage: "structured-output",
					structuredOutputCause: "schema-validation",
					...(schemaIssues ? { schemaIssues } : {}),
					...(result.finishReason ? { finishReason: result.finishReason } : {}),
					...(finiteToken(totalInputTokens) !== undefined
						? { inputTokens: finiteToken(totalInputTokens) }
						: {}),
					...(finiteToken(totalOutputTokens) !== undefined
						? { outputTokens: finiteToken(totalOutputTokens) }
						: {}),
				});
			}
			output = parsed.data;
		}
		if (options.onEvaluationCapture) {
			await captureSalesRequestEvaluationResponse(options.onEvaluationCapture, {
				status: "returned",
				text: result.text || null,
				inputTokens: result.usage.inputTokens ?? null,
				outputTokens: result.usage.outputTokens ?? null,
				finishReason: result.finishReason ?? null,
			});
		}

		return {
			output,
			inputTokens: totalInputTokens,
			outputTokens: totalOutputTokens,
			provider: selection.provider,
			model: selection.model,
		};
	};
	return (input) => execute(input);
}
