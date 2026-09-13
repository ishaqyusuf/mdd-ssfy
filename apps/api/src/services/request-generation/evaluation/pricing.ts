import { z } from "zod";

export const SALES_REQUEST_EVALUATION_PRICING_SCHEMA_VERSION = 1 as const;

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
const TOKENS_PER_MILLION = 1_000_000n;
const MAX_SAFE_INTEGER_BIGINT = BigInt(MAX_SAFE_INTEGER);

const nullableMicrosSchema = z
	.number()
	.int()
	.nonnegative()
	.max(MAX_SAFE_INTEGER)
	.nullable();

export const salesRequestEvaluationPricingSnapshotSchema = z
	.object({
		schemaVersion: z.literal(SALES_REQUEST_EVALUATION_PRICING_SCHEMA_VERSION),
		provider: z.enum(["openai", "anthropic", "deepseek", "google"]),
		model: z.string().trim().min(1).max(160),
		currency: z.string().regex(/^[A-Z]{3}$/),
		effectiveAt: z.string().date(),
		sourceDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
		ratesPerMillionTokens: z
			.object({
				inputMicros: nullableMicrosSchema,
				outputMicros: nullableMicrosSchema,
				cachedInputMicros: nullableMicrosSchema.optional(),
			})
			.strict(),
		maxEstimatedCallCostMicros: z
			.number()
			.int()
			.nonnegative()
			.max(MAX_SAFE_INTEGER),
	})
	.strict();

export type SalesRequestEvaluationPricingSnapshot = z.infer<
	typeof salesRequestEvaluationPricingSnapshotSchema
>;

export const salesRequestEvaluationTokenUsageSchema = z
	.object({
		inputTokens: z
			.number()
			.int()
			.nonnegative()
			.max(MAX_SAFE_INTEGER)
			.nullable(),
		outputTokens: z
			.number()
			.int()
			.nonnegative()
			.max(MAX_SAFE_INTEGER)
			.nullable(),
		cachedInputTokens: z
			.number()
			.int()
			.nonnegative()
			.max(MAX_SAFE_INTEGER)
			.nullable()
			.optional(),
	})
	.strict()
	.superRefine((usage, context) => {
		if (
			usage.inputTokens !== null &&
			usage.cachedInputTokens != null &&
			usage.cachedInputTokens > usage.inputTokens
		) {
			context.addIssue({
				code: "custom",
				path: ["cachedInputTokens"],
				message: "Cached input tokens cannot exceed total input tokens",
			});
		}
	});

export type SalesRequestEvaluationTokenUsage = z.infer<
	typeof salesRequestEvaluationTokenUsageSchema
>;

export type SalesRequestEvaluationPricingValidationIssue = {
	path: string;
	message: string;
};

export type SalesRequestEvaluationPricingValidationResult =
	| {
			valid: true;
			value: SalesRequestEvaluationPricingSnapshot;
			issues: [];
	  }
	| {
			valid: false;
			value: null;
			issues: SalesRequestEvaluationPricingValidationIssue[];
	  };

export function validateSalesRequestEvaluationPricingSnapshot(
	value: unknown,
): SalesRequestEvaluationPricingValidationResult {
	const parsed = salesRequestEvaluationPricingSnapshotSchema.safeParse(value);
	if (parsed.success) return { valid: true, value: parsed.data, issues: [] };
	return {
		valid: false,
		value: null,
		issues: parsed.error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
		})),
	};
}

export type SalesRequestEvaluationCostBlocker =
	| "invalid-pricing-snapshot"
	| "invalid-token-usage"
	| "input-tokens-unavailable"
	| "output-tokens-unavailable"
	| "input-rate-unavailable"
	| "output-rate-unavailable"
	| "cost-overflow";

type CostResultBase = {
	pricing: {
		provider: SalesRequestEvaluationPricingSnapshot["provider"];
		model: string;
		currency: string;
		effectiveAt: string;
		sourceDigest: string;
		maxEstimatedCallCostMicros: number;
	} | null;
	usage: SalesRequestEvaluationTokenUsage | null;
	exactCostMicros: number | null;
	minimumCostMicros: number | null;
	maximumCostMicros: number | null;
	withinCeiling: boolean | null;
};

export type SalesRequestEvaluationCostResult =
	| (CostResultBase & {
			status: "not-evaluable";
			evaluable: false;
			blockers: SalesRequestEvaluationCostBlocker[];
	  })
	| (CostResultBase & {
			status: "within-ceiling" | "ceiling-exceeded";
			evaluable: true;
			blockers: [];
			pricing: NonNullable<CostResultBase["pricing"]>;
			usage: SalesRequestEvaluationTokenUsage & {
				inputTokens: number;
				outputTokens: number;
			};
			minimumCostMicros: number;
			maximumCostMicros: number;
			withinCeiling: boolean;
			inputCostMode: "standard" | "known-cache-split" | "unknown-cache-range";
	  });

function pricingIdentity(
	snapshot: SalesRequestEvaluationPricingSnapshot,
): NonNullable<CostResultBase["pricing"]> {
	return {
		provider: snapshot.provider,
		model: snapshot.model,
		currency: snapshot.currency,
		effectiveAt: snapshot.effectiveAt,
		sourceDigest: snapshot.sourceDigest,
		maxEstimatedCallCostMicros: snapshot.maxEstimatedCallCostMicros,
	};
}

function ceilingDivide(numerator: bigint) {
	return (numerator + TOKENS_PER_MILLION - 1n) / TOKENS_PER_MILLION;
}

function calculatedCostMicros(input: {
	inputTokens: number;
	outputTokens: number;
	inputRateMicros: number;
	outputRateMicros: number;
	knownCachedInputTokens?: number;
	cachedInputRateMicros?: number;
}) {
	const inputTokens = BigInt(input.inputTokens);
	const outputTokens = BigInt(input.outputTokens);
	const inputRate = BigInt(input.inputRateMicros);
	const outputRate = BigInt(input.outputRateMicros);
	let numerator = inputTokens * inputRate + outputTokens * outputRate;
	if (
		input.knownCachedInputTokens !== undefined &&
		input.cachedInputRateMicros !== undefined
	) {
		const cachedTokens = BigInt(input.knownCachedInputTokens);
		numerator =
			(inputTokens - cachedTokens) * inputRate +
			cachedTokens * BigInt(input.cachedInputRateMicros) +
			outputTokens * outputRate;
	}
	return ceilingDivide(numerator);
}

function safeNumber(value: bigint) {
	return value <= MAX_SAFE_INTEGER_BIGINT ? Number(value) : null;
}

function notEvaluable(input: {
	pricing: CostResultBase["pricing"];
	usage: SalesRequestEvaluationTokenUsage | null;
	blockers: SalesRequestEvaluationCostBlocker[];
}): SalesRequestEvaluationCostResult {
	return {
		status: "not-evaluable",
		evaluable: false,
		blockers: [...new Set(input.blockers)],
		pricing: input.pricing,
		usage: input.usage,
		exactCostMicros: null,
		minimumCostMicros: null,
		maximumCostMicros: null,
		withinCeiling: null,
	};
}

export function calculateSalesRequestEvaluationCost(input: {
	pricingSnapshot: unknown;
	usage: unknown;
}): SalesRequestEvaluationCostResult {
	const pricing = salesRequestEvaluationPricingSnapshotSchema.safeParse(
		input.pricingSnapshot,
	);
	if (!pricing.success) {
		return notEvaluable({
			pricing: null,
			usage: null,
			blockers: ["invalid-pricing-snapshot"],
		});
	}
	const pricingValue = pricing.data;
	const pricingResult = pricingIdentity(pricingValue);
	const usage = salesRequestEvaluationTokenUsageSchema.safeParse(input.usage);
	if (!usage.success) {
		return notEvaluable({
			pricing: pricingResult,
			usage: null,
			blockers: ["invalid-token-usage"],
		});
	}

	const usageValue = usage.data;
	const blockers: SalesRequestEvaluationCostBlocker[] = [];
	if (usageValue.inputTokens === null)
		blockers.push("input-tokens-unavailable");
	if (usageValue.outputTokens === null)
		blockers.push("output-tokens-unavailable");
	if (pricingValue.ratesPerMillionTokens.inputMicros === null)
		blockers.push("input-rate-unavailable");
	if (pricingValue.ratesPerMillionTokens.outputMicros === null)
		blockers.push("output-rate-unavailable");
	if (blockers.length) {
		return notEvaluable({
			pricing: pricingResult,
			usage: usageValue,
			blockers,
		});
	}

	const inputTokens = usageValue.inputTokens as number;
	const outputTokens = usageValue.outputTokens as number;
	const inputRateMicros = pricingValue.ratesPerMillionTokens
		.inputMicros as number;
	const outputRateMicros = pricingValue.ratesPerMillionTokens
		.outputMicros as number;
	const cachedInputRateMicros =
		pricingValue.ratesPerMillionTokens.cachedInputMicros;
	let minimum: bigint;
	let maximum: bigint;
	let inputCostMode: Extract<
		SalesRequestEvaluationCostResult,
		{ evaluable: true }
	>["inputCostMode"] = "standard";

	if (cachedInputRateMicros == null) {
		minimum = calculatedCostMicros({
			inputTokens,
			outputTokens,
			inputRateMicros,
			outputRateMicros,
		});
		maximum = minimum;
	} else if (usageValue.cachedInputTokens != null) {
		minimum = calculatedCostMicros({
			inputTokens,
			outputTokens,
			inputRateMicros,
			outputRateMicros,
			knownCachedInputTokens: usageValue.cachedInputTokens,
			cachedInputRateMicros,
		});
		maximum = minimum;
		inputCostMode = "known-cache-split";
	} else {
		const allStandard = calculatedCostMicros({
			inputTokens,
			outputTokens,
			inputRateMicros,
			outputRateMicros,
		});
		const allCached = calculatedCostMicros({
			inputTokens,
			outputTokens,
			inputRateMicros: cachedInputRateMicros,
			outputRateMicros,
		});
		minimum = allStandard < allCached ? allStandard : allCached;
		maximum = allStandard > allCached ? allStandard : allCached;
		inputCostMode = "unknown-cache-range";
	}

	const minimumCostMicros = safeNumber(minimum);
	const maximumCostMicros = safeNumber(maximum);
	if (minimumCostMicros === null || maximumCostMicros === null) {
		return notEvaluable({
			pricing: pricingResult,
			usage: usageValue,
			blockers: ["cost-overflow"],
		});
	}
	const withinCeiling =
		maximumCostMicros <= pricingValue.maxEstimatedCallCostMicros;
	return {
		status: withinCeiling ? "within-ceiling" : "ceiling-exceeded",
		evaluable: true,
		blockers: [],
		pricing: pricingResult,
		usage: {
			...usageValue,
			inputTokens,
			outputTokens,
		},
		exactCostMicros:
			minimumCostMicros === maximumCostMicros ? minimumCostMicros : null,
		minimumCostMicros,
		maximumCostMicros,
		withinCeiling,
		inputCostMode,
	};
}
