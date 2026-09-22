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

// Dense multi-line requests can exceed 4K before the seed JSON closes.
export const SALES_REQUEST_MAX_OUTPUT_TOKENS = 8_000;
const SALES_REQUEST_DENSE_SCHEDULE_MAX_OUTPUT_TOKENS = 12_000;

export function salesRequestMaxOutputTokens(sourceText: string) {
	const rows = sourceText.split(/\r?\n/).map((row) => row.trim());
	const roomRows = rows.filter((row) =>
		/^[^:\n]{2,80}\s+-\s+\d{2,3}\s*["”']?\s*[x×]\s*\d{2,3}/i.test(row));
	const architecturalRows = rows.filter((row) =>
		/^(?:(?:bifold|pocket)\s+)?(?:[1-9][-/](?:1[01]|\d)|\d{2})\s+[1-9][-/](?:1[01]|\d)\b/i.test(row));
	const sideHeadings = new Set(
		rows.filter((row) => /^(left|right) side$/i.test(row))
			.map((row) => row.toLowerCase()),
	);
	const sideDoorRows = rows.filter((row) =>
		/^(?:\d+\s*[x×]\s*)?\d{2}\s*["”]\s*(?:LT|RT)?\s*=/.test(row));
	return roomRows.length >= 12 || architecturalRows.length >= 8 ||
		(sideHeadings.size === 2 && sideDoorRows.length >= 12)
		? SALES_REQUEST_DENSE_SCHEDULE_MAX_OUTPUT_TOKENS
		: SALES_REQUEST_MAX_OUTPUT_TOKENS;
}
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
	outputShape?: "object" | "array" | "primitive" | "invalid-json";
	repairAttempted?: boolean;
	configurationIssue?: "source" | "source-coverage" | "moulding-product" | "moulding-quantity" | "interpretation-source" | "interpretation-route" | "interpretation-title" | "custom-source" | "service-source" | "door-dimension-source" | "delivery-option-source" | "delivery-amount-source" | "route" | "catalog" | "dimensions" | "mouldings" | "interpretation" | "other";
	routeFailureKind?: "missing-root" | "interior-for-exterior" | "slab-for-prehung" | "outside-step" | "service-route" | "swing-route";
	catalogFailureKind?: "unavailable-component" | "hidden-component" | "selection-shape";
	schemaIssues?: Array<{
		code: string;
		path: string;
		detail?: "zero-quantity" | "hpt-quantity-mismatch" | "zero-handed-units";
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
	"interpretations",
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
	"selectedProdUid",
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
	const issues: NonNullable<SalesRequestProviderFailureDiagnostic["schemaIssues"]> = [];
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
		const message = "message" in issue ? issue.message : undefined;
		const detail = path === "lineItems.[].qty" && code === "custom"
			? message === "Zero quantities require selected moulding rows and an explicit quantity review"
				? "zero-quantity" as const
				: message === "Line quantity must equal its HPT door quantity"
					? "hpt-quantity-mismatch" as const : undefined
			: path === "lineItems.[].housePackageTool.doors.[]" &&
				code === "custom" &&
				message === "A door row must contain at least one handed unit"
				? "zero-handed-units" as const : undefined;
		issues.push({ code, path, ...(detail ? { detail } : {}) });
		if (issues.length === 12) break;
	}
	return issues.length > 0 ? issues : undefined;
}

function structuredOutputCauseDiagnostic(error: NoObjectGeneratedError) {
	let outputShape: SalesRequestProviderFailureDiagnostic["outputShape"];
	if (error.text?.trim()) {
		try {
			const parsed: unknown = JSON.parse(error.text);
			outputShape = Array.isArray(parsed)
				? "array"
				: parsed !== null && typeof parsed === "object"
					? "object"
					: "primitive";
		} catch {
			outputShape = "invalid-json";
		}
	}
	if (JSONParseError.isInstance(error.cause)) {
		return { structuredOutputCause: "json-parse" as const, outputShape };
	}
	if (TypeValidationError.isInstance(error.cause)) {
		return {
			structuredOutputCause: "schema-validation" as const,
			outputShape,
			...(() => {
				const schemaIssues = safeSchemaIssues(error.cause.cause);
				return schemaIssues ? { schemaIssues } : {};
			})(),
		};
	}
	return {};
}

function seedRepairFeedback(
	issues: z.ZodIssue[],
	seed?: z.infer<typeof newSalesFormSeedV2Schema>,
) {
	return JSON.stringify(
		issues.map(({ path, message }) => {
			const lineIndex = path[0] === "lineItems" ? path[1] : undefined;
			const line =
				typeof lineIndex === "number" ? seed?.lineItems[lineIndex] : undefined;
			if (
				message === "A door row must contain at least one handed unit" &&
				path[2] === "housePackageTool" && path[3] === "doors"
			) {
				return {
					path,
					message: "A handled door row cannot use zero left and zero right as placeholders. Use a positive side count only when stated or confirmed. Otherwise omit housePackageTool on that line, retain its stated line quantity, and ask a line-scoped ambiguous handing question naming the room and exact stated size. Never invent a split.",
				};
			}
			if (
				message === "Zero quantities require selected moulding rows and an explicit quantity review" &&
				path[2] === "qty"
			) {
				return {
					path,
					message: "Do not leave an unconfigured item as a zero-quantity line. Use a positive quantity only when the source or complete selected rows support it. Otherwise omit that line and keep its stated side, item and quantity in a line-scoped unresolved Sales review note. Do not infer a product, stock length or quantity.",
				};
			}
			if (
				message !== "Line quantity must equal its HPT door quantity" ||
				path[2] !== "qty" ||
				!line?.housePackageTool
			) {
				return { path, message };
			}
			const doorRowTotal = line.housePackageTool.doors.reduce(
				(total, door) =>
					total +
					("totalQty" in door ? door.totalQty : door.lhQty + door.rhQty),
				0,
			);
			return { path, message, lineQty: line.qty, doorRowTotal };
		}),
	);
}

export function safeConfigurationIssue(message: string): SalesRequestProviderFailureDiagnostic["configurationIssue"] {
	if (/The door schedule has \d+ explicit entries|The door schedule selects \d+ units|The room door schedule has \d+ sized entries|The unsized .+ schedule entry must remain unresolved|width \d+' must remain an ambiguous question|The request includes \d+ (?:door stop|base|casing|crown) pieces|requested pocket door hardware is missing/i.test(message))
		return "source-coverage";
	if (/Moulding component .* must be stated|Requested Moulding .* is missing/i.test(message))
		return "moulding-product";
	if (/Moulding quantity .* must be stated|Moulding linear feet|Moulding piece length|Moulding waste percentage/i.test(message))
		return "moulding-quantity";
	if (/interpretation source text must be quoted/i.test(message))
		return "interpretation-source";
	if (/interpretation references a step outside its configured route/i.test(message))
		return "interpretation-route";
	if (/interpretation must use the current configured component title/i.test(message))
		return "interpretation-title";
	if (/Custom value .* must be stated/i.test(message))
		return "custom-source";
	if (/Service .* must be stated/i.test(message))
		return "service-source";
	if (/line uses a different size than the customer request/i.test(message))
		return "door-dimension-source";
	if (/Door dimension .* must be stated/i.test(message))
		return "door-dimension-source";
	if (/Delivery option .* must be stated/i.test(message))
		return "delivery-option-source";
	if (/Door design that does not match the six-panel customer request|door panel Height from the overall sidelite assembly size/i.test(message))
		return "source";
	if (/delivery amount must be stated/i.test(message))
		return "delivery-amount-source";
	if (/must be stated in the customer request|must be quoted from the customer request/i.test(message))
		return "source";
	if (/moulding|linear feet|piece length|waste percentage/i.test(message))
		return "mouldings";
	if (/interpretation/i.test(message)) return "interpretation";
	if (/dimension|height|door sizes|HPT quantity shape/i.test(message))
		return "dimensions";
	if (/route|exterior-only/i.test(message)) return "route";
	if (/component|visibility|hidden|selection shape/i.test(message))
		return "catalog";
	return "other";
}

export function safeRouteFailureKind(message: string): SalesRequestProviderFailureDiagnostic["routeFailureKind"] {
	if (/must select exactly one configured item route|has no configured item route/i.test(message)) return "missing-root";
	if (/selects an interior route for an exterior-only customer request/i.test(message)) return "interior-for-exterior";
	if (/selects a slabs-only route for a pre-hung customer request/i.test(message)) return "slab-for-prehung";
	if (/selects step .* outside the .* route/i.test(message)) return "outside-step";
	if (/places service rows outside a Services route/i.test(message)) return "service-route";
	if (/includes swing on a route that does not support it/i.test(message)) return "swing-route";
	return undefined;
}

export function safeCatalogFailureKind(message: string): SalesRequestProviderFailureDiagnostic["catalogFailureKind"] {
	if (/references an unavailable component for step/i.test(message)) return "unavailable-component";
	if (/selects a component hidden by configured rules/i.test(message)) return "hidden-component";
	if (/uses the wrong selection shape for step/i.test(message)) return "selection-shape";
	return undefined;
}

function configurationRepairFeedback(message: string) {
	if (/The door schedule has \d+ explicit entries/i.test(message)) {
		return `${message} Count each separate door schedule row, including repeated sizes, bifolds, pocket doors and garage doors. Keep compatible units with their exact source count; for each unsupported or ambiguous row include its original dimension and descriptor in unresolved. Do not omit rows or increase another line's quantity to hide omissions.`;
	}
	if (/selects a Door design that does not match the six-panel customer request/i.test(message)) {
		return `${message} Remove the incompatible Door choice. Select a visible six-panel fiberglass impact panel only if its configured category and route match the request; otherwise leave Door unresolved. Keep the PVC frame, right sidelite, overall assembly size and brick moulding as separate Sales review facts. Do not substitute a lite or flush design.`;
	}
	if (/selects a door panel Height from the overall sidelite assembly size/i.test(message)) {
		return `${message} The 69-5/8 x 80 overall size includes the right sidelite. Do not apply its 80-inch height to the 36-inch door panel without a panel-height statement or confirmed answer. Remove the ungrounded Height and dependent HPT size; keep the panel width, RH outswing, overall assembly size, sidelite and PVC frame in Sales review and ask for the panel height.`;
	}
	if (/The door schedule selects \d+ units/i.test(message)) {
		return `${message} Count only exact stated architectural dimensions as selected HPT units. A bare width followed by a slash height, such as 28 8/0, needs its own width-unit question; do not use another row's 2/8 size to resolve it.`;
	}
	if (/The room door schedule has \d+ sized entries/i.test(message)) {
		return `${message} For each named room, preserve its source dimensions and unit count in housePackageTool doors when supported. If the width or product is ambiguous, keep the room name and exact source notation in an unresolved review item instead of treating a bare line quantity as a complete door.`;
	}
	if (/The unsized .+ schedule entry must remain unresolved/i.test(message)) {
		return `${message} Keep the exact room name in an unresolved question. Do not assign another room's size or product to this blank entry.`;
	}
	if (/width \d+' must remain an ambiguous question/i.test(message)) {
		return `${message} For a complete named door row, treat a plausible door width written with one apostrophe as the likely inches typo only when its exact converted dimension is available for that line's selected configuration. Keep the line and add an unsupported widthAssumption review quoting the conversion. If the exact size is unavailable, leave the row for Sales review without substituting another size.`;
	}
	if (/The request includes \d+ (?:door stop|base|casing|crown) pieces|requested pocket door hardware is missing/i.test(message)) {
		return `${message} Keep the stated accessory count and description. Select a catalog component only when it matches; otherwise add a quantity-preserving unresolved fact for that accessory. Do not hide it in another line's quantity.`;
	}
	if (/selects a slabs-only route for a pre-hung customer request/i.test(message)) {
		return `${message} Remove the slabs-only line for the affected pre-hung assembly. Preserve only source-stated unit and leaf counts, with an unresolved review fact if the native route cannot express them. Select a compatible assembly route when available; do not invent a Door product, jamb or handed split.`;
	}
	if (/line uses a different size than the customer request/i.test(message)) {
		return `${message} Compare this named room against its exact source row. Use that room's stated width, height and count only when the selected native route supports them; otherwise remove the conflicting size and keep the room and its exact source dimension in an unresolved Sales review note. Do not borrow another room's size or ask the customer to restate a dimension already supplied.`;
	}
	if (/selects Height \d+[-/]\d+, which is not stated in the customer request/i.test(message)) {
		return `${message} The source may state only a door count and width, such as 2 x 30-inch doors. That is not a two-dimensional door size and does not supply a height. Remove every ungrounded Height selection and its dependent HPT dimensions; retain each affected side, room, width, handing and count in separate unresolved Sales review facts, then ask only for the missing height. Do not substitute a standard height.`;
	}
	const category = safeConfigurationIssue(message);
	if (category === "moulding-product") {
		return `${message} Review every selected Moulding product, including boards and baseboard on each side. Remove each selection whose catalog identity is not stated or confirmed, not just the product named in this error. Keep a separate line-scoped unresolved review for each affected source line with its stated side, linear feet or piece count. Do not derive pieces from an unstated stock length or reduce a stated count to one. Do not substitute a different profile.`;
	}
	if (category === "door-dimension-source") {
		return `${message} Remove the unsupported housePackageTool dimension for the affected line. Keep the stated count and any reliable width or height in unresolved; ask only for a genuinely missing measurement. For a complete named door row, a plausible door width written with one apostrophe may use the exact inches conversion only when that dimension is available for the selected configuration, with an unsupported widthAssumption Sales review note. Do not invent or substitute another size.`;
	}
	if (category === "dimensions") {
		return `${message} Compare each door's requested width and height with the selected route, Door Configuration, Height and available housePackageTool sizes. An 80-inch height is 6-8, not 8-0; 8-0 means 96 inches. Keep compatible requested door rows. For an unavailable size, omit its invalid housePackageTool row and record its exact requested dimension, count and handing as unsupported in unresolved; never substitute another height or width. If a shorthand width is ambiguous, ask for confirmation instead of guessing.`;
	}
	if (category === "route") {
		return `${message} Keep each requested line on one compatible configured route. If the request explicitly says exterior, remove the Interior route. Remove selections outside that route; when no compatible route exists, retain the exact source-stated room, count and product facts in unresolved for Sales review. Do not add slab lines or invent unit, leaf or configuration details.`;
	}
	if (category === "delivery-option-source") {
		return `${message} Omit form entirely until the customer explicitly states pickup or delivery.`;
	}
	if (category === "delivery-amount-source") {
		return `${message} Omit the unstated delivery extra cost; do not invent a charge.`;
	}
	return message;
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
	/** Trusted server-side credential override for Assistant-owned runs. */
	apiKey?: string;
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
	const apiKey = options.apiKey?.trim() || getSalesRequestProviderApiKey(
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
									content: `Correct the previous JSON once. Validation errors: ${repair.feedback}. For a line quantity mismatch, compare the door-row total with the customer's request before changing either number or the rows. Return the complete seed JSON. Preserve every source quantity and dimension; never invent facts to satisfy validation. Use unresolved status only ambiguous, unreadable, or unsupported. Omit empty optional arrays. Output contract: ${JSON.stringify(z.toJSONSchema(newSalesFormSeedV2Schema))}`,
								},
							]
						: []),
				],
				abortSignal: input.signal,
				providerOptions: getSalesRequestProviderRuntimeOptions(
					selection.provider,
				),
				maxRetries,
				maxOutputTokens: salesRequestMaxOutputTokens(input.text),
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
			if (
				options.maxOutputRepairs === 1 &&
				!repair &&
				NoObjectGeneratedError.isInstance(error) &&
				error.text?.trim() &&
				error.finishReason !== "length" &&
				!input.signal.aborted
			) {
				return execute(input, {
					text: error.text,
					feedback: "The previous response was not a valid seed JSON object.",
					inputTokens: error.usage?.inputTokens ?? 0,
					outputTokens: error.usage?.outputTokens ?? 0,
				});
			}
			throw new SalesRequestProviderExecutionError({
				...classifySalesRequestProviderFailure(error),
				repairAttempted: Boolean(repair),
			});
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
			if (
				options.maxOutputRepairs === 1 &&
				!repair &&
				result.text?.trim() &&
				result.finishReason !== "length" &&
				!input.signal.aborted
			) {
				return execute(input, {
					text: result.text,
					feedback: "The previous response was not a valid seed JSON object.",
					inputTokens: result.usage.inputTokens ?? 0,
					outputTokens: result.usage.outputTokens ?? 0,
				});
			}
			throw new SalesRequestProviderExecutionError({
				stage: "structured-output",
				repairAttempted: Boolean(repair),
				finishReason: result.finishReason,
				...(finiteToken(totalInputTokens) !== undefined
					? { inputTokens: finiteToken(totalInputTokens) }
					: {}),
				...(finiteToken(totalOutputTokens) !== undefined
					? { outputTokens: finiteToken(totalOutputTokens) }
					: {}),
			});
		}
		if (selection.provider === "deepseek") {
			const configuration = JSON.parse(input.configurationJson) as {
				routes?: Array<{ rootStepId: number }>;
				steps?: Array<{ id: number; title?: string; selectionMode?: string; components?: Array<[string, string]> }>;
			};
			const multipleStepIds = new Set(
				(configuration.steps || [])
					.filter((step) => step.selectionMode === "multiple")
					.map((step) => step.id),
			);
			const shape = newSalesFormSeedV2Schema.safeParse(
				normalizeSalesRequestProviderEnvelope(output, multipleStepIds,
					(() => {
						const heightStep = configuration.steps?.find((step) =>
							step.title?.trim().toLowerCase() === "height");
						const eightyInchUid = heightStep?.components?.find(
							([, title]) => title.trim() === "6-8")?.[0];
						return heightStep && eightyInchUid
							? {
								sourceText: input.text,
								heightStepId: heightStep.id,
								eightyInchUid,
							}
							: undefined;
					})(),
					new Set(configuration.routes?.map((route) => route.rootStepId)),
				),
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
							(configurationError && configurationRepairFeedback(configurationError)) ||
								(!parsed.success
									? seedRepairFeedback(
											parsed.error.issues,
											shape.success ? shape.data : undefined,
										)
									: ""),
						inputTokens: result.usage.inputTokens ?? 0,
						outputTokens: result.usage.outputTokens ?? 0,
					});
				}
				const routeFailureKind = configurationError
					? safeRouteFailureKind(configurationError) : undefined;
				const catalogFailureKind = configurationError
					? safeCatalogFailureKind(configurationError) : undefined;
				throw new SalesRequestProviderExecutionError({
					stage: "structured-output",
					structuredOutputCause: "schema-validation",
					repairAttempted: Boolean(repair),
					...(configurationError
						? { configurationIssue: safeConfigurationIssue(configurationError) }
						: {}),
					...(routeFailureKind ? { routeFailureKind } : {}),
					...(catalogFailureKind ? { catalogFailureKind } : {}),
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
