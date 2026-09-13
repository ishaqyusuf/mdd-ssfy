import { describe, expect, test } from "bun:test";
import {
	estimateAssistantUsageCostMicros,
	normalizeAssistantProviderUsageCalls,
	normalizeAssistantUsageReceipt,
} from "./assistant";

describe("Assistant usage receipt normalization", () => {
	test("preserves reported categories and leaves missing categories unknown", () => {
		expect(
			normalizeAssistantUsageReceipt(
				{
					provider: "openai",
					model: "gpt-5-mini",
					inputTokens: 101.9,
					outputTokens: 42,
					totalTokens: 143,
				},
				"openai:gpt-5-mini",
			),
		).toEqual({
			provider: "openai",
			model: "gpt-5-mini",
			inputTokens: 101,
			cachedInputTokens: null,
			outputTokens: 42,
			reasoningTokens: null,
			totalTokens: 143,
		});
	});

	test("derives identity from the trusted run without inventing token counts", () => {
		expect(
			normalizeAssistantUsageReceipt(undefined, "google:gemini-2.5-flash"),
		).toEqual({
			provider: "google",
			model: "gemini-2.5-flash",
			inputTokens: null,
			cachedInputTokens: null,
			outputTokens: null,
			reasoningTokens: null,
			totalTokens: null,
		});
	});

	test("preserves separate provider calls while bounding their identities", () => {
		expect(
			normalizeAssistantProviderUsageCalls(
				{
					calls: [
						{
							providerRequestId: "openai:response-1",
							provider: "openai",
							model: "gpt-5-mini",
							inputTokens: 10,
							outputTokens: 5,
							toolCallCount: 2,
						},
						{
							provider: "openai",
							model: "gpt-5-mini",
							totalTokens: 7,
						},
					],
				},
				"openai:gpt-5-mini",
				"run-1",
			),
		).toEqual([
			{
				providerRequestId: "openai:response-1",
				provider: "openai",
				model: "gpt-5-mini",
				inputTokens: 10,
				cachedInputTokens: null,
				outputTokens: 5,
				reasoningTokens: null,
				totalTokens: null,
				toolCallCount: 2,
			},
			{
				providerRequestId: "run-1:2",
				provider: "openai",
				model: "gpt-5-mini",
				inputTokens: null,
				cachedInputTokens: null,
				outputTokens: null,
				reasoningTokens: null,
				totalTokens: 7,
				toolCallCount: 0,
			},
		]);
	});

	test("estimates micros with stable half-up rounding", () => {
		const usage = normalizeAssistantUsageReceipt(
			{ inputTokens: 1_500, outputTokens: 500 },
			"openai:gpt-5-mini",
		);
		expect(
			estimateAssistantUsageCostMicros(usage, {
				version: "2026-09",
				inputPerMillionMicros: 250_000n,
				cachedPerMillionMicros: 25_000n,
				outputPerMillionMicros: 2_000_000n,
				reasoningPerMillionMicros: 2_000_000n,
			}),
		).toBe(1_375n);
	});
});
