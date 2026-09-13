import { describe, expect, test } from "bun:test";
import {
	calculateSalesRequestEvaluationCost,
	salesRequestEvaluationPricingSnapshotSchema,
	validateSalesRequestEvaluationPricingSnapshot,
} from "./pricing";

const sourceDigest = `sha256:${"a".repeat(64)}`;

function pricingSnapshot(
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		schemaVersion: 1,
		provider: "deepseek",
		model: "deepseek-v4-flash",
		currency: "USD",
		effectiveAt: "2026-09-12",
		sourceDigest,
		ratesPerMillionTokens: {
			inputMicros: 220_000,
			outputMicros: 660_000,
		},
		maxEstimatedCallCostMicros: 2_000,
		...overrides,
	};
}

describe("sales request evaluation pricing", () => {
	test("strictly validates dated, source-bound integer-micro pricing", () => {
		expect(
			salesRequestEvaluationPricingSnapshotSchema.parse(pricingSnapshot()),
		).toMatchObject({
			provider: "deepseek",
			model: "deepseek-v4-flash",
			currency: "USD",
			effectiveAt: "2026-09-12",
			sourceDigest,
		});
		expect(
			validateSalesRequestEvaluationPricingSnapshot({
				...pricingSnapshot(),
				unexpected: true,
			}),
		).toMatchObject({ valid: false, value: null });
		expect(
			validateSalesRequestEvaluationPricingSnapshot(
				pricingSnapshot({ effectiveAt: "2026-09-12T12:00:00Z" }),
			),
		).toMatchObject({ valid: false });
		expect(
			validateSalesRequestEvaluationPricingSnapshot(
				pricingSnapshot({
					ratesPerMillionTokens: {
						inputMicros: 0.22,
						outputMicros: 660_000,
					},
				}),
			),
		).toMatchObject({ valid: false });
	});

	test("uses exact BigInt ceiling arithmetic for standard input pricing", () => {
		expect(
			calculateSalesRequestEvaluationCost({
				pricingSnapshot: pricingSnapshot(),
				usage: { inputTokens: 7_378, outputTokens: 143 },
			}),
		).toMatchObject({
			status: "within-ceiling",
			evaluable: true,
			exactCostMicros: 1_718,
			minimumCostMicros: 1_718,
			maximumCostMicros: 1_718,
			withinCeiling: true,
			inputCostMode: "standard",
		});
	});

	test("returns a conservative cached-input range when usage lacks the split", () => {
		const result = calculateSalesRequestEvaluationCost({
			pricingSnapshot: pricingSnapshot({
				ratesPerMillionTokens: {
					inputMicros: 220_000,
					cachedInputMicros: 7_000,
					outputMicros: 660_000,
				},
			}),
			usage: { inputTokens: 7_378, outputTokens: 143 },
		});

		expect(result).toMatchObject({
			status: "within-ceiling",
			evaluable: true,
			exactCostMicros: null,
			minimumCostMicros: 147,
			maximumCostMicros: 1_718,
			inputCostMode: "unknown-cache-range",
		});
	});

	test("uses a known cached-input split and enforces the maximum ceiling", () => {
		const result = calculateSalesRequestEvaluationCost({
			pricingSnapshot: pricingSnapshot({
				ratesPerMillionTokens: {
					inputMicros: 2,
					cachedInputMicros: 1,
					outputMicros: 3,
				},
				maxEstimatedCallCostMicros: 4,
			}),
			usage: {
				inputTokens: 1_000_000,
				cachedInputTokens: 250_000,
				outputTokens: 1_000_000,
			},
		});

		expect(result).toMatchObject({
			status: "ceiling-exceeded",
			evaluable: true,
			exactCostMicros: 5,
			minimumCostMicros: 5,
			maximumCostMicros: 5,
			withinCeiling: false,
			inputCostMode: "known-cache-split",
		});
	});

	test("keeps unknown tokens and rates null and not evaluable", () => {
		const missingTokens = calculateSalesRequestEvaluationCost({
			pricingSnapshot: pricingSnapshot(),
			usage: { inputTokens: null, outputTokens: null },
		});
		expect(missingTokens).toMatchObject({
			status: "not-evaluable",
			evaluable: false,
			blockers: ["input-tokens-unavailable", "output-tokens-unavailable"],
			exactCostMicros: null,
			minimumCostMicros: null,
			maximumCostMicros: null,
			withinCeiling: null,
		});

		const missingRates = calculateSalesRequestEvaluationCost({
			pricingSnapshot: pricingSnapshot({
				ratesPerMillionTokens: {
					inputMicros: null,
					outputMicros: null,
				},
			}),
			usage: { inputTokens: 10, outputTokens: 20 },
		});
		expect(missingRates).toMatchObject({
			status: "not-evaluable",
			blockers: ["input-rate-unavailable", "output-rate-unavailable"],
			exactCostMicros: null,
		});
	});

	test("rejects impossible cache usage without estimating a cost", () => {
		expect(
			calculateSalesRequestEvaluationCost({
				pricingSnapshot: pricingSnapshot(),
				usage: {
					inputTokens: 10,
					cachedInputTokens: 11,
					outputTokens: 2,
				},
			}),
		).toMatchObject({
			status: "not-evaluable",
			blockers: ["invalid-token-usage"],
			exactCostMicros: null,
		});
	});
});
