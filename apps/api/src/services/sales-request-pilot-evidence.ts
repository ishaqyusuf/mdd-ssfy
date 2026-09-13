export const SALES_REQUEST_PILOT_EVIDENCE_VERSION =
	"sales-request-pilot-evidence-v1";
export const SALES_REQUEST_PILOT_EVIDENCE_MAX_ROWS = 10_000;

const MAX_COUNT = 100_000_000;
const MAX_DURATION_MS = 86_400_000;
const MAX_PROVIDER_LATENCY_MS = 300_000;
const VERSION_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const SHA256_DIGEST = /^sha256:[a-f0-9]{64}$/;
const ISO_UTC_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const terminalStatuses = new Set([
	"succeeded",
	"provider-error",
	"invalid-output",
	"configuration-changed",
	"configuration-error",
	"cancelled",
	"usage-denied",
	"unknown",
]);
const knownStatuses = new Set(["started", ...terminalStatuses]);
const providerTerminalStatuses = new Set([
	"succeeded",
	"provider-error",
	"invalid-output",
	"configuration-changed",
]);
const feedbackOutcomes = new Set([
	"accepted",
	"accepted-with-edits",
	"rejected",
]);

export type SalesRequestPilotEvidenceRow = {
	status?: string | null;
	completedAt?: Date | null;
	providerAttemptedAt?: Date | null;
	providerLatencyMs?: number | null;
	inputTokens?: number | null;
	outputTokens?: number | null;
	issueCounts?: unknown;
	applyOutcome?: string | null;
	saveDraftOutcome?: string | null;
	saveFinalOutcome?: string | null;
	feedbackOutcome?: string | null;
	feedbackIssueCategories?: unknown;
	feedbackChangedFieldCategories?: unknown;
	correctionMs?: number | null;
};

export type SalesRequestPilotEvidenceCollection = {
	periodClosed: boolean;
	retentionWindowAvailable: boolean;
	sourceTruncated: boolean;
};

export type SalesRequestPilotThresholdPolicy = {
	policyVersion: string;
	minimumSucceededRuns: number;
	minimumAppliedRuns: number;
	maxProviderP95Ms: number;
	maxInputTokensPerAttempt: number;
	maxOutputTokensPerAttempt: number;
	pricingCurrency: string;
	pricingEffectiveAt: string;
	pricingEvidenceDigest: string;
	inputPriceMicrosPerMillionTokens: number;
	outputPriceMicrosPerMillionTokens: number;
	maxEstimatedPeriodCostMicros: number;
	manualBaselineRequestFamily: string;
	manualBaselineMeasuredAt: string;
	manualBaselineSampleCount: number;
	manualBaselineEvidenceDigest: string;
	manualCorrectionBaselineP95Ms: number;
	maxUnsafeSelectionFeedbackCount: number;
	maxUnsafeApplyCount: number;
	minimumSaveReopenChecks: number;
};

/**
 * Aggregate-only human evidence. A later persistence adapter is responsible for
 * verifying that the digest and named reviewer are durable before passing it here.
 */
export type SalesRequestPilotEvidenceSignoff = {
	status: "verified";
	reviewerUserId: number;
	reviewedAt: string;
	evidenceDigest: string;
	authorityMatched: boolean;
	benchmarkPassed: boolean;
	unsafeApplyCount: number;
	ambiguousUnsupportedFactCount: number;
	ambiguousUnsupportedVisibleCount: number;
	saveReopenCheckedCount: number;
	saveReopenSucceededCount: number;
};

type CoverageCount = {
	expected: number;
	observed: number;
	missing: number;
	complete: boolean;
};

export type SalesRequestPilotThresholdCheck = {
	id:
		| "minimum-succeeded-runs"
		| "minimum-applied-runs"
		| "benchmark"
		| "authority"
		| "provider-latency-p95"
		| "input-token-ceiling"
		| "output-token-ceiling"
		| "estimated-period-cost"
		| "correction-below-manual"
		| "unsafe-selection-feedback"
		| "unsafe-apply"
		| "ambiguous-unsupported-containment"
		| "save-reopen"
		| "save-failures"
		| "evidence-semantics";
	status: "pass" | "fail";
};

export type SalesRequestPilotEvidence = {
	version: typeof SALES_REQUEST_PILOT_EVIDENCE_VERSION;
	reviewability: {
		status: "reviewable" | "not-reviewable";
		blockers: string[];
	};
	coverage: {
		lifecycle: CoverageCount;
		providerAttemptMarker: CoverageCount;
		providerLatency: CoverageCount;
		tokenUsage: {
			expected: number;
			inputObserved: number;
			outputObserved: number;
			inputMissing: number;
			outputMissing: number;
			complete: boolean;
		};
		issueCounts: CoverageCount;
		feedback: CoverageCount;
		acceptedApplication: CoverageCount;
		correction: CoverageCount;
		advancementComplete: boolean;
	};
	metrics: {
		generationCount: number;
		succeededCount: number;
		providerAttemptCount: number;
		statusCounts: Record<string, number>;
		tokenTotals: { input: number | null; output: number | null };
		maxTokensPerAttempt: { input: number | null; output: number | null };
		issueTotals: {
			ambiguous: number;
			unreadable: number;
			unsupported: number;
		} | null;
		outcomes: {
			applied: number;
			accepted: number;
			acceptedWithEdits: number;
			rejected: number;
			saveFailures: number;
			unsafeSelectionFeedback: number;
		};
		providerLatency: {
			sampleCount: number;
			p50Ms: number | null;
			p95Ms: number | null;
		};
		correction: {
			sampleCount: number;
			p50Ms: number | null;
			p95Ms: number | null;
		};
		semanticViolations: {
			acceptedWithoutApply: number;
			appliedWithoutFeedback: number;
		};
	};
	advancement: SalesRequestPilotThresholdEvaluation;
};

export type SalesRequestPilotThresholdEvaluation = {
	status: "pass" | "fail" | "not-evaluable";
	blockers: string[];
	checks: SalesRequestPilotThresholdCheck[];
	estimatedPeriodCostMicros: number | null;
};

export type SalesRequestPilotThresholdEvaluationInput = {
	thresholds: SalesRequestPilotThresholdPolicy;
	signoff: SalesRequestPilotEvidenceSignoff;
};

function isDate(value: unknown): value is Date {
	return value instanceof Date && Number.isFinite(value.getTime());
}

function boundedInteger(value: unknown, maximum = MAX_COUNT): value is number {
	return (
		Number.isSafeInteger(value) &&
		(value as number) >= 0 &&
		(value as number) <= maximum
	);
}

function coverage(expected: number, observed: number): CoverageCount {
	const missing = Math.max(0, expected - observed);
	return { expected, observed, missing, complete: missing === 0 };
}

function validIssueCounts(value: unknown): value is {
	ambiguous: number;
	unreadable: number;
	unsupported: number;
} {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const counts = value as Record<string, unknown>;
	return (
		boundedInteger(counts.ambiguous, 100_000) &&
		boundedInteger(counts.unreadable, 100_000) &&
		boundedInteger(counts.unsupported, 100_000)
	);
}

function validFeedback(row: SalesRequestPilotEvidenceRow) {
	if (
		typeof row.feedbackOutcome === "string" &&
		feedbackOutcomes.has(row.feedbackOutcome) &&
		Array.isArray(row.feedbackIssueCategories) &&
		row.feedbackIssueCategories.length <= 12 &&
		row.feedbackIssueCategories.every((value) => typeof value === "string")
	) {
		if (row.feedbackOutcome === "rejected") {
			return row.feedbackIssueCategories.length > 0;
		}
		if (row.feedbackOutcome === "accepted-with-edits") {
			return (
				Array.isArray(row.feedbackChangedFieldCategories) &&
				row.feedbackChangedFieldCategories.length > 0 &&
				row.feedbackChangedFieldCategories.length <= 12 &&
				row.feedbackChangedFieldCategories.every(
					(value) => typeof value === "string",
				)
			);
		}
		return true;
	}
	return false;
}

function percentile(values: readonly number[], proportion: number) {
	if (!values.length) return null;
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.ceil(proportion * sorted.length) - 1] ?? null;
}

function completeTotal(values: readonly (number | null)[]) {
	if (values.some((value) => value === null)) return null;
	return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function completeMaximum(values: readonly (number | null)[]) {
	if (values.some((value) => value === null)) return null;
	return values.length ? Math.max(...(values as number[])) : 0;
}

function notEvaluable(
	...blockers: string[]
): SalesRequestPilotThresholdEvaluation {
	return {
		status: "not-evaluable",
		blockers,
		checks: [],
		estimatedPeriodCostMicros: null,
	};
}

function validThresholdPolicy(value: SalesRequestPilotThresholdPolicy) {
	return (
		VERSION_TOKEN.test(value.policyVersion) &&
		boundedInteger(value.minimumSucceededRuns, 10_000) &&
		value.minimumSucceededRuns > 0 &&
		boundedInteger(value.minimumAppliedRuns, 10_000) &&
		value.minimumAppliedRuns > 0 &&
		boundedInteger(value.maxProviderP95Ms, MAX_PROVIDER_LATENCY_MS) &&
		value.maxProviderP95Ms > 0 &&
		boundedInteger(value.maxInputTokensPerAttempt) &&
		boundedInteger(value.maxOutputTokensPerAttempt) &&
		/^[A-Z]{3}$/.test(value.pricingCurrency) &&
		ISO_UTC_DATE_TIME.test(value.pricingEffectiveAt) &&
		Number.isFinite(Date.parse(value.pricingEffectiveAt)) &&
		SHA256_DIGEST.test(value.pricingEvidenceDigest) &&
		boundedInteger(value.inputPriceMicrosPerMillionTokens, 1_000_000_000) &&
		boundedInteger(value.outputPriceMicrosPerMillionTokens, 1_000_000_000) &&
		boundedInteger(value.maxEstimatedPeriodCostMicros, MAX_COUNT) &&
		VERSION_TOKEN.test(value.manualBaselineRequestFamily) &&
		ISO_UTC_DATE_TIME.test(value.manualBaselineMeasuredAt) &&
		Number.isFinite(Date.parse(value.manualBaselineMeasuredAt)) &&
		boundedInteger(value.manualBaselineSampleCount, 10_000) &&
		value.manualBaselineSampleCount > 0 &&
		SHA256_DIGEST.test(value.manualBaselineEvidenceDigest) &&
		boundedInteger(value.manualCorrectionBaselineP95Ms, MAX_DURATION_MS) &&
		value.manualCorrectionBaselineP95Ms > 0 &&
		boundedInteger(value.maxUnsafeSelectionFeedbackCount, 10_000) &&
		boundedInteger(value.maxUnsafeApplyCount, 10_000) &&
		boundedInteger(value.minimumSaveReopenChecks, 10_000) &&
		value.minimumSaveReopenChecks > 0
	);
}

function validSignoff(value: SalesRequestPilotEvidenceSignoff) {
	return (
		value.status === "verified" &&
		Number.isSafeInteger(value.reviewerUserId) &&
		value.reviewerUserId > 0 &&
		typeof value.reviewedAt === "string" &&
		ISO_UTC_DATE_TIME.test(value.reviewedAt) &&
		Number.isFinite(Date.parse(value.reviewedAt)) &&
		SHA256_DIGEST.test(value.evidenceDigest) &&
		typeof value.authorityMatched === "boolean" &&
		typeof value.benchmarkPassed === "boolean" &&
		boundedInteger(value.unsafeApplyCount, 10_000) &&
		boundedInteger(value.ambiguousUnsupportedFactCount, 100_000) &&
		boundedInteger(value.ambiguousUnsupportedVisibleCount, 100_000) &&
		value.ambiguousUnsupportedVisibleCount <=
			value.ambiguousUnsupportedFactCount &&
		boundedInteger(value.saveReopenCheckedCount, 10_000) &&
		boundedInteger(value.saveReopenSucceededCount, 10_000) &&
		value.saveReopenSucceededCount <= value.saveReopenCheckedCount
	);
}

function exactCostMicros(
	inputTokens: number,
	outputTokens: number,
	thresholds: SalesRequestPilotThresholdPolicy,
) {
	const numerator =
		BigInt(inputTokens) * BigInt(thresholds.inputPriceMicrosPerMillionTokens) +
		BigInt(outputTokens) * BigInt(thresholds.outputPriceMicrosPerMillionTokens);
	const cost = (numerator + BigInt(999_999)) / BigInt(1_000_000);
	return cost <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cost) : null;
}

export function deriveSalesRequestPilotEvidence(
	rows: readonly SalesRequestPilotEvidenceRow[],
	input: {
		collection: SalesRequestPilotEvidenceCollection;
		thresholds?: SalesRequestPilotThresholdPolicy;
		signoff?: SalesRequestPilotEvidenceSignoff;
	},
): SalesRequestPilotEvidence {
	if (rows.length > SALES_REQUEST_PILOT_EVIDENCE_MAX_ROWS) {
		throw new RangeError(
			`Sales Request pilot evidence is limited to ${SALES_REQUEST_PILOT_EVIDENCE_MAX_ROWS} rows.`,
		);
	}

	const reviewBlockers: string[] = [];
	if (!input.collection.periodClosed) reviewBlockers.push("period-open");
	if (!input.collection.retentionWindowAvailable) {
		reviewBlockers.push("retention-window-unavailable");
	}
	if (input.collection.sourceTruncated)
		reviewBlockers.push("row-set-truncated");
	if (!rows.length) reviewBlockers.push("no-runs");

	const terminalRows = rows.filter(
		(row) =>
			typeof row.status === "string" &&
			terminalStatuses.has(row.status) &&
			isDate(row.completedAt),
	);
	const providerRows = rows.filter((row) => isDate(row.providerAttemptedAt));
	const providerMarkerExpected = rows.filter(
		(row) =>
			isDate(row.providerAttemptedAt) ||
			(typeof row.status === "string" &&
				providerTerminalStatuses.has(row.status)),
	).length;
	const providerLatencies = providerRows.map((row) =>
		boundedInteger(row.providerLatencyMs, MAX_PROVIDER_LATENCY_MS)
			? row.providerLatencyMs
			: null,
	);
	const inputTokens = providerRows.map((row) =>
		boundedInteger(row.inputTokens) ? row.inputTokens : null,
	);
	const outputTokens = providerRows.map((row) =>
		boundedInteger(row.outputTokens) ? row.outputTokens : null,
	);
	const succeededRows = rows.filter((row) => row.status === "succeeded");
	const issueRows = succeededRows.filter((row) =>
		validIssueCounts(row.issueCounts),
	);
	const feedbackRows = succeededRows.filter(validFeedback);
	const acceptedRows = feedbackRows.filter(
		(row) =>
			row.feedbackOutcome === "accepted" ||
			row.feedbackOutcome === "accepted-with-edits",
	);
	const appliedRows = succeededRows.filter(
		(row) => row.applyOutcome === "applied",
	);
	const editedRows = feedbackRows.filter(
		(row) =>
			row.feedbackOutcome === "accepted-with-edits" &&
			row.applyOutcome === "applied",
	);
	const observedEditedCorrectionValues = editedRows
		.map((row) =>
			boundedInteger(row.correctionMs, MAX_DURATION_MS)
				? row.correctionMs
				: null,
		)
		.filter((value): value is number => value !== null);
	const correctionValues = [
		...feedbackRows
			.filter(
				(row) =>
					row.feedbackOutcome === "accepted" && row.applyOutcome === "applied",
			)
			.map(() => 0),
		...observedEditedCorrectionValues,
	];

	const lifecycleCoverage = coverage(rows.length, terminalRows.length);
	const providerMarkerCoverage = coverage(
		providerMarkerExpected,
		providerRows.length,
	);
	const providerLatencyCoverage = coverage(
		providerRows.length,
		providerLatencies.filter((value) => value !== null).length,
	);
	const tokenCoverage = {
		expected: providerRows.length,
		inputObserved: inputTokens.filter((value) => value !== null).length,
		outputObserved: outputTokens.filter((value) => value !== null).length,
		inputMissing: inputTokens.filter((value) => value === null).length,
		outputMissing: outputTokens.filter((value) => value === null).length,
		complete:
			inputTokens.every((value) => value !== null) &&
			outputTokens.every((value) => value !== null),
	};
	const issueCoverage = coverage(succeededRows.length, issueRows.length);
	const feedbackCoverage = coverage(succeededRows.length, feedbackRows.length);
	const acceptedApplicationCoverage = coverage(
		acceptedRows.length,
		acceptedRows.filter((row) => row.applyOutcome === "applied").length,
	);
	const correctionCoverage = coverage(
		editedRows.length,
		observedEditedCorrectionValues.length,
	);
	const semanticViolations = {
		acceptedWithoutApply: acceptedApplicationCoverage.missing,
		appliedWithoutFeedback: appliedRows.filter((row) => !validFeedback(row))
			.length,
	};
	const advancementComplete =
		lifecycleCoverage.complete &&
		providerMarkerCoverage.complete &&
		providerLatencyCoverage.complete &&
		tokenCoverage.complete &&
		issueCoverage.complete &&
		feedbackCoverage.complete &&
		acceptedApplicationCoverage.complete &&
		correctionCoverage.complete &&
		Object.values(semanticViolations).every((count) => count === 0);

	const statusCounts: Record<string, number> = {};
	for (const row of rows) {
		const status =
			typeof row.status === "string" && knownStatuses.has(row.status)
				? row.status
				: "unknown";
		statusCounts[status] = (statusCounts[status] ?? 0) + 1;
	}
	const issueTotals = issueCoverage.complete
		? issueRows.reduce(
				(total, row) => {
					const counts = row.issueCounts as {
						ambiguous: number;
						unreadable: number;
						unsupported: number;
					};
					total.ambiguous += counts.ambiguous;
					total.unreadable += counts.unreadable;
					total.unsupported += counts.unsupported;
					return total;
				},
				{ ambiguous: 0, unreadable: 0, unsupported: 0 },
			)
		: null;
	const validProviderLatencies = providerLatencies.filter(
		(value): value is number => value !== null,
	);
	const metrics: SalesRequestPilotEvidence["metrics"] = {
		generationCount: rows.length,
		succeededCount: succeededRows.length,
		providerAttemptCount: providerRows.length,
		statusCounts,
		tokenTotals: {
			input: completeTotal(inputTokens),
			output: completeTotal(outputTokens),
		},
		maxTokensPerAttempt: {
			input: completeMaximum(inputTokens),
			output: completeMaximum(outputTokens),
		},
		issueTotals,
		outcomes: {
			applied: appliedRows.length,
			accepted: feedbackRows.filter((row) => row.feedbackOutcome === "accepted")
				.length,
			acceptedWithEdits: feedbackRows.filter(
				(row) => row.feedbackOutcome === "accepted-with-edits",
			).length,
			rejected: feedbackRows.filter((row) => row.feedbackOutcome === "rejected")
				.length,
			saveFailures: succeededRows.filter(
				(row) =>
					row.saveDraftOutcome === "failed" ||
					row.saveFinalOutcome === "failed",
			).length,
			unsafeSelectionFeedback: feedbackRows.filter((row) =>
				(row.feedbackIssueCategories as unknown[]).includes("unsafe-selection"),
			).length,
		},
		providerLatency: {
			sampleCount: validProviderLatencies.length,
			p50Ms: percentile(validProviderLatencies, 0.5),
			p95Ms: percentile(validProviderLatencies, 0.95),
		},
		correction: {
			sampleCount: correctionValues.length,
			p50Ms: percentile(correctionValues, 0.5),
			p95Ms: percentile(correctionValues, 0.95),
		},
		semanticViolations,
	};
	const evidence: SalesRequestPilotEvidence = {
		version: SALES_REQUEST_PILOT_EVIDENCE_VERSION,
		reviewability: {
			status: reviewBlockers.length ? "not-reviewable" : "reviewable",
			blockers: reviewBlockers,
		},
		coverage: {
			lifecycle: lifecycleCoverage,
			providerAttemptMarker: providerMarkerCoverage,
			providerLatency: providerLatencyCoverage,
			tokenUsage: tokenCoverage,
			issueCounts: issueCoverage,
			feedback: feedbackCoverage,
			acceptedApplication: acceptedApplicationCoverage,
			correction: correctionCoverage,
			advancementComplete,
		},
		metrics,
		advancement: notEvaluable(
			...(input.thresholds ? [] : ["threshold-policy-unavailable"]),
			...(input.signoff ? [] : ["signoff-unavailable"]),
		),
	};
	if (input.thresholds && input.signoff) {
		evidence.advancement = evaluateSalesRequestPilotThresholds(evidence, {
			thresholds: input.thresholds,
			signoff: input.signoff,
		});
	}
	return evidence;
}

export function evaluateSalesRequestPilotThresholds(
	evidence: SalesRequestPilotEvidence,
	input: SalesRequestPilotThresholdEvaluationInput,
): SalesRequestPilotThresholdEvaluation {
	if (!validThresholdPolicy(input.thresholds)) {
		return notEvaluable("invalid-threshold-policy");
	}
	if (!validSignoff(input.signoff)) return notEvaluable("invalid-signoff");
	const blockers: string[] = [];
	if (evidence.reviewability.status !== "reviewable") {
		blockers.push("period-not-reviewable");
	}
	if (!evidence.coverage.advancementComplete) {
		blockers.push("evidence-coverage-incomplete");
	}
	const inputTotal = evidence.metrics.tokenTotals.input;
	const outputTotal = evidence.metrics.tokenTotals.output;
	const estimatedPeriodCostMicros =
		inputTotal === null || outputTotal === null
			? null
			: exactCostMicros(inputTotal, outputTotal, input.thresholds);
	if (estimatedPeriodCostMicros === null) blockers.push("cost-unavailable");
	if (blockers.length) return notEvaluable(...blockers);

	const thresholds = input.thresholds;
	const signoff = input.signoff;
	const check = (
		id: SalesRequestPilotThresholdCheck["id"],
		passed: boolean,
	): SalesRequestPilotThresholdCheck => ({
		id,
		status: passed ? "pass" : "fail",
	});
	const checks: SalesRequestPilotThresholdCheck[] = [
		check(
			"minimum-succeeded-runs",
			evidence.metrics.succeededCount >= thresholds.minimumSucceededRuns,
		),
		check(
			"minimum-applied-runs",
			evidence.metrics.outcomes.applied >= thresholds.minimumAppliedRuns,
		),
		check("benchmark", signoff.benchmarkPassed),
		check("authority", signoff.authorityMatched),
		check(
			"provider-latency-p95",
			(evidence.metrics.providerLatency.p95Ms ?? Number.POSITIVE_INFINITY) <=
				thresholds.maxProviderP95Ms,
		),
		check(
			"input-token-ceiling",
			(evidence.metrics.maxTokensPerAttempt.input ??
				Number.POSITIVE_INFINITY) <= thresholds.maxInputTokensPerAttempt,
		),
		check(
			"output-token-ceiling",
			(evidence.metrics.maxTokensPerAttempt.output ??
				Number.POSITIVE_INFINITY) <= thresholds.maxOutputTokensPerAttempt,
		),
		check(
			"estimated-period-cost",
			(estimatedPeriodCostMicros as number) <=
				thresholds.maxEstimatedPeriodCostMicros,
		),
		check(
			"correction-below-manual",
			(evidence.metrics.correction.p95Ms ?? Number.POSITIVE_INFINITY) <
				thresholds.manualCorrectionBaselineP95Ms,
		),
		check(
			"unsafe-selection-feedback",
			evidence.metrics.outcomes.unsafeSelectionFeedback <=
				thresholds.maxUnsafeSelectionFeedbackCount,
		),
		check(
			"unsafe-apply",
			signoff.unsafeApplyCount <= thresholds.maxUnsafeApplyCount,
		),
		check(
			"ambiguous-unsupported-containment",
			signoff.ambiguousUnsupportedVisibleCount ===
				signoff.ambiguousUnsupportedFactCount,
		),
		check(
			"save-reopen",
			signoff.saveReopenCheckedCount >= thresholds.minimumSaveReopenChecks &&
				signoff.saveReopenSucceededCount === signoff.saveReopenCheckedCount,
		),
		check("save-failures", evidence.metrics.outcomes.saveFailures === 0),
		check(
			"evidence-semantics",
			Object.values(evidence.metrics.semanticViolations).every(
				(count) => count === 0,
			),
		),
	];
	return {
		status: checks.every((item) => item.status === "pass") ? "pass" : "fail",
		blockers: [],
		checks,
		estimatedPeriodCostMicros,
	};
}
