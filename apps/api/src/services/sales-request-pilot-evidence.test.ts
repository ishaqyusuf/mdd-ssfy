import { describe, expect, test } from "bun:test";
import {
	type SalesRequestPilotEvidenceRow,
	type SalesRequestPilotEvidenceSignoff,
	type SalesRequestPilotThresholdPolicy,
	deriveSalesRequestPilotEvidence,
	evaluateSalesRequestPilotThresholds,
} from "./sales-request-pilot-evidence";

const completedAt = new Date("2026-09-13T10:00:05.000Z");
const providerAttemptedAt = new Date("2026-09-13T10:00:00.000Z");

function row(
	overrides: Partial<SalesRequestPilotEvidenceRow> = {},
): SalesRequestPilotEvidenceRow {
	return {
		status: "succeeded",
		completedAt,
		providerAttemptedAt,
		providerLatencyMs: 5_000,
		inputTokens: 1_000,
		outputTokens: 200,
		issueCounts: { ambiguous: 0, unreadable: 0, unsupported: 0 },
		applyOutcome: "applied",
		feedbackOutcome: "accepted-with-edits",
		feedbackIssueCategories: [],
		feedbackChangedFieldCategories: ["line-items"],
		correctionMs: 20_000,
		saveDraftOutcome: "saved",
		saveFinalOutcome: null,
		...overrides,
	};
}

const collection = {
	periodClosed: true,
	retentionWindowAvailable: true,
	sourceTruncated: false,
};

const thresholds: SalesRequestPilotThresholdPolicy = {
	policyVersion: "pilot-gates-v1",
	minimumSucceededRuns: 1,
	minimumAppliedRuns: 1,
	maxProviderP95Ms: 10_000,
	maxInputTokensPerAttempt: 2_000,
	maxOutputTokensPerAttempt: 400,
	pricingCurrency: "USD",
	pricingEffectiveAt: "2026-09-01T00:00:00.000Z",
	pricingEvidenceDigest:
		"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
	inputPriceMicrosPerMillionTokens: 100_000,
	outputPriceMicrosPerMillionTokens: 500_000,
	maxEstimatedPeriodCostMicros: 1_000,
	manualBaselineRequestFamily: "sales-request-text-v1",
	manualBaselineMeasuredAt: "2026-08-31T12:00:00.000Z",
	manualBaselineSampleCount: 5,
	manualBaselineEvidenceDigest:
		"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
	manualCorrectionBaselineP95Ms: 30_000,
	maxUnsafeSelectionFeedbackCount: 0,
	maxUnsafeApplyCount: 0,
	minimumSaveReopenChecks: 1,
};

const signoff: SalesRequestPilotEvidenceSignoff = {
	status: "verified",
	reviewerUserId: 42,
	reviewedAt: "2026-09-13T12:00:00.000Z",
	evidenceDigest:
		"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	authorityMatched: true,
	benchmarkPassed: true,
	unsafeApplyCount: 0,
	ambiguousUnsupportedFactCount: 2,
	ambiguousUnsupportedVisibleCount: 2,
	saveReopenCheckedCount: 1,
	saveReopenSucceededCount: 1,
};

describe("deriveSalesRequestPilotEvidence", () => {
	test("derives complete privacy-safe coverage without exposing row identities", () => {
		const evidence = deriveSalesRequestPilotEvidence([row()], { collection });

		expect(evidence.reviewability).toEqual({
			status: "reviewable",
			blockers: [],
		});
		expect(evidence.coverage).toMatchObject({
			lifecycle: { expected: 1, observed: 1, missing: 0, complete: true },
			providerAttemptMarker: {
				expected: 1,
				observed: 1,
				missing: 0,
				complete: true,
			},
			providerLatency: {
				expected: 1,
				observed: 1,
				missing: 0,
				complete: true,
			},
			tokenUsage: {
				expected: 1,
				inputObserved: 1,
				outputObserved: 1,
				inputMissing: 0,
				outputMissing: 0,
				complete: true,
			},
			issueCounts: {
				expected: 1,
				observed: 1,
				missing: 0,
				complete: true,
			},
			feedback: { expected: 1, observed: 1, missing: 0, complete: true },
			acceptedApplication: {
				expected: 1,
				observed: 1,
				missing: 0,
				complete: true,
			},
			correction: { expected: 1, observed: 1, missing: 0, complete: true },
			advancementComplete: true,
		});
		expect(evidence.metrics).toMatchObject({
			generationCount: 1,
			succeededCount: 1,
			providerAttemptCount: 1,
			tokenTotals: { input: 1_000, output: 200 },
			providerLatency: { sampleCount: 1, p50Ms: 5_000, p95Ms: 5_000 },
			correction: { sampleCount: 1, p50Ms: 20_000, p95Ms: 20_000 },
			semanticViolations: {
				acceptedWithoutApply: 0,
				appliedWithoutFeedback: 0,
			},
		});
		expect(evidence.advancement).toEqual({
			status: "not-evaluable",
			blockers: ["threshold-policy-unavailable", "signoff-unavailable"],
			checks: [],
			estimatedPeriodCostMicros: null,
		});
		expect(JSON.stringify(evidence)).not.toMatch(
			/generationId|actorUserId|sourceText|providerBody|seedDigest|consumedSalesId/,
		);

		const signed = deriveSalesRequestPilotEvidence([row()], {
			collection,
			thresholds,
			signoff,
		});
		expect(signed.advancement.status).toBe("pass");
	});

	test("preserves missing token totals as null while treating explicit zero as known", () => {
		const missing = deriveSalesRequestPilotEvidence(
			[row({ inputTokens: null }), row({ inputTokens: 0, outputTokens: 0 })],
			{ collection },
		);
		expect(missing.metrics.tokenTotals).toEqual({ input: null, output: 200 });
		expect(missing.coverage.tokenUsage).toMatchObject({
			expected: 2,
			inputObserved: 1,
			inputMissing: 1,
			outputObserved: 2,
			outputMissing: 0,
			complete: false,
		});
		expect(missing.coverage.advancementComplete).toBe(false);

		const zero = deriveSalesRequestPilotEvidence(
			[row({ inputTokens: 0, outputTokens: 0 })],
			{ collection },
		);
		expect(zero.metrics.tokenTotals).toEqual({ input: 0, output: 0 });
		expect(zero.coverage.tokenUsage.complete).toBe(true);
	});

	test("separates operational reviewability from incomplete advancement evidence", () => {
		const evidence = deriveSalesRequestPilotEvidence(
			[
				row({
					status: "started",
					completedAt: null,
					providerAttemptedAt: null,
				}),
				row({
					issueCounts: null,
					feedbackOutcome: null,
					feedbackIssueCategories: null,
					applyOutcome: null,
					correctionMs: null,
				}),
			],
			{ collection, thresholds, signoff },
		);

		expect(evidence.reviewability.status).toBe("reviewable");
		expect(evidence.coverage.lifecycle).toMatchObject({
			missing: 1,
			complete: false,
		});
		expect(evidence.coverage.issueCounts).toMatchObject({ missing: 1 });
		expect(evidence.coverage.feedback).toMatchObject({ missing: 1 });
		expect(evidence.coverage.advancementComplete).toBe(false);
		expect(evidence.advancement.status).toBe("not-evaluable");
		expect(evidence.advancement.blockers).toContain(
			"evidence-coverage-incomplete",
		);
	});

	test("requires a provider-attempt marker for statuses that imply a paid call", () => {
		const evidence = deriveSalesRequestPilotEvidence(
			[row({ providerAttemptedAt: null, providerLatencyMs: null })],
			{ collection, thresholds, signoff },
		);

		expect(evidence.coverage.providerAttemptMarker).toEqual({
			expected: 1,
			observed: 0,
			missing: 1,
			complete: false,
		});
		expect(evidence.advancement).toMatchObject({
			status: "not-evaluable",
			blockers: ["evidence-coverage-incomplete"],
		});
	});

	test("requires a closed retained non-truncated nonempty row set for reviewability", () => {
		const evidence = deriveSalesRequestPilotEvidence([], {
			collection: {
				periodClosed: false,
				retentionWindowAvailable: false,
				sourceTruncated: true,
			},
		});
		expect(evidence.reviewability).toEqual({
			status: "not-reviewable",
			blockers: [
				"period-open",
				"retention-window-unavailable",
				"row-set-truncated",
				"no-runs",
			],
		});
	});

	test("detects accepted/apply semantics and missing correction samples", () => {
		const evidence = deriveSalesRequestPilotEvidence(
			[
				row({ applyOutcome: null, correctionMs: null }),
				row({ feedbackOutcome: null, feedbackIssueCategories: null }),
				row({
					feedbackOutcome: "rejected",
					feedbackIssueCategories: ["unsafe-selection"],
					feedbackChangedFieldCategories: [],
					correctionMs: null,
				}),
				row({ correctionMs: null }),
			],
			{ collection },
		);

		expect(evidence.coverage.feedback).toMatchObject({ missing: 1 });
		expect(evidence.coverage.acceptedApplication).toMatchObject({
			expected: 2,
			observed: 1,
			missing: 1,
		});
		expect(evidence.coverage.correction).toMatchObject({
			expected: 1,
			observed: 0,
			missing: 1,
		});
		expect(evidence.metrics.semanticViolations).toEqual({
			acceptedWithoutApply: 1,
			appliedWithoutFeedback: 1,
		});
		expect(evidence.coverage.advancementComplete).toBe(false);
	});

	test("rejects more than the bounded maximum number of rows", () => {
		expect(() =>
			deriveSalesRequestPilotEvidence(
				Array.from({ length: 10_001 }, () => row()),
				{ collection },
			),
		).toThrow(RangeError);
	});
});

describe("evaluateSalesRequestPilotThresholds", () => {
	test("passes exact inclusive ceilings and the strict manual-time comparison", () => {
		const evidence = deriveSalesRequestPilotEvidence([row()], { collection });
		const evaluation = evaluateSalesRequestPilotThresholds(evidence, {
			thresholds: {
				...thresholds,
				maxProviderP95Ms: 5_000,
				maxInputTokensPerAttempt: 1_000,
				maxOutputTokensPerAttempt: 200,
				maxEstimatedPeriodCostMicros: 200,
				manualCorrectionBaselineP95Ms: 20_001,
			},
			signoff,
		});

		expect(evaluation.status).toBe("pass");
		expect(evaluation.blockers).toEqual([]);
		expect(evaluation.estimatedPeriodCostMicros).toBe(200);
		expect(evaluation.checks.every((check) => check.status === "pass")).toBe(
			true,
		);
	});

	test("fails threshold breaches but leaves missing evidence not evaluable", () => {
		const complete = deriveSalesRequestPilotEvidence([row()], { collection });
		const failed = evaluateSalesRequestPilotThresholds(complete, {
			thresholds: {
				...thresholds,
				maxProviderP95Ms: 4_999,
				manualCorrectionBaselineP95Ms: 20_000,
			},
			signoff: { ...signoff, benchmarkPassed: false },
		});
		expect(failed.status).toBe("fail");
		expect(failed.checks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: "benchmark", status: "fail" }),
				expect.objectContaining({ id: "provider-latency-p95", status: "fail" }),
				expect.objectContaining({
					id: "correction-below-manual",
					status: "fail",
				}),
			]),
		);

		const incomplete = deriveSalesRequestPilotEvidence(
			[row({ outputTokens: null })],
			{ collection },
		);
		const unavailable = evaluateSalesRequestPilotThresholds(incomplete, {
			thresholds,
			signoff,
		});
		expect(unavailable.status).toBe("not-evaluable");
		expect(unavailable.estimatedPeriodCostMicros).toBeNull();
		expect(unavailable.blockers).toContain("evidence-coverage-incomplete");
	});

	test("rejects malformed threshold and signoff inputs without treating them as failures", () => {
		const evidence = deriveSalesRequestPilotEvidence([row()], { collection });
		const invalidThreshold = evaluateSalesRequestPilotThresholds(evidence, {
			thresholds: { ...thresholds, maxProviderP95Ms: -1 },
			signoff,
		});
		expect(invalidThreshold).toMatchObject({
			status: "not-evaluable",
			blockers: ["invalid-threshold-policy"],
		});

		const invalidSignoff = evaluateSalesRequestPilotThresholds(evidence, {
			thresholds,
			signoff: { ...signoff, evidenceDigest: "sha256:not-a-digest" },
		});
		expect(invalidSignoff).toMatchObject({
			status: "not-evaluable",
			blockers: ["invalid-signoff"],
		});
	});
});
