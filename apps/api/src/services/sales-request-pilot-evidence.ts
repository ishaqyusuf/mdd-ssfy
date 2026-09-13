import {
	type SalesRequestPilotThresholdPolicy,
	salesRequestPilotThresholdPolicySchema,
} from "@gnd/settings";
import { z } from "zod";
import {
	type SalesRequestPilotEvidenceSignoff,
	salesRequestPilotEvidenceSignoffSchema,
} from "./sales-request-pilot-evidence-signoff";

export type { SalesRequestPilotThresholdPolicy } from "@gnd/settings";
export type { SalesRequestPilotEvidenceSignoff } from "./sales-request-pilot-evidence-signoff";

export const SALES_REQUEST_PILOT_EVIDENCE_VERSION =
	"sales-request-pilot-evidence-v1";
export const SALES_REQUEST_PILOT_EVIDENCE_MAX_ROWS = 10_000;

const MAX_COUNT = 100_000_000;
const MAX_DURATION_MS = 86_400_000;
const MAX_PROVIDER_LATENCY_MS = 300_000;

const terminalStatuses = new Set([
	"succeeded",
	"provider-error",
	"invalid-output",
	"configuration-changed",
	"configuration-error",
	"cancelled",
	"usage-denied",
]);
const knownStatuses = new Set(["started", "unknown", ...terminalStatuses]);
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

const evidenceCountSchema = z.number().int().nonnegative().max(MAX_COUNT);
const nullableEvidenceCountSchema = evidenceCountSchema.nullable();
const evidenceBlockerSchema = z.string().min(1).max(128);
const coverageCountSchema = z
	.object({
		expected: evidenceCountSchema,
		observed: evidenceCountSchema,
		missing: evidenceCountSchema,
		complete: z.boolean(),
	})
	.strict();
const thresholdCheckSchema = z
	.object({
		id: z.enum([
			"minimum-succeeded-runs",
			"minimum-applied-runs",
			"benchmark",
			"authority",
			"provider-latency-p95",
			"input-token-ceiling",
			"output-token-ceiling",
			"estimated-period-cost",
			"correction-below-manual",
			"unsafe-selection-feedback",
			"unsafe-apply",
			"ambiguous-unsupported-containment",
			"save-reopen",
			"save-failures",
			"evidence-semantics",
		]),
		status: z.enum(["pass", "fail"]),
	})
	.strict();
const thresholdEvaluationSchema = z
	.object({
		status: z.enum(["pass", "fail", "not-evaluable"]),
		blockers: z.array(evidenceBlockerSchema).max(64),
		checks: z.array(thresholdCheckSchema).max(32),
		estimatedPeriodCostMicros: nullableEvidenceCountSchema,
	})
	.strict();
const durationSummarySchema = z
	.object({
		sampleCount: evidenceCountSchema,
		p50Ms: nullableEvidenceCountSchema,
		p95Ms: nullableEvidenceCountSchema,
	})
	.strict();

/** Strict aggregate-only persistence boundary for pilot review evidence. */
export const salesRequestPilotEvidenceSchema: z.ZodType<SalesRequestPilotEvidence> =
	z
		.object({
			version: z.literal(SALES_REQUEST_PILOT_EVIDENCE_VERSION),
			reviewability: z
				.object({
					status: z.enum(["reviewable", "not-reviewable"]),
					blockers: z.array(evidenceBlockerSchema).max(64),
				})
				.strict(),
			coverage: z
				.object({
					lifecycle: coverageCountSchema,
					providerAttemptMarker: coverageCountSchema,
					providerLatency: coverageCountSchema,
					tokenUsage: z
						.object({
							expected: evidenceCountSchema,
							inputObserved: evidenceCountSchema,
							outputObserved: evidenceCountSchema,
							inputMissing: evidenceCountSchema,
							outputMissing: evidenceCountSchema,
							complete: z.boolean(),
						})
						.strict(),
					issueCounts: coverageCountSchema,
					feedback: coverageCountSchema,
					acceptedApplication: coverageCountSchema,
					correction: coverageCountSchema,
					advancementComplete: z.boolean(),
				})
				.strict(),
			metrics: z
				.object({
					generationCount: evidenceCountSchema,
					succeededCount: evidenceCountSchema,
					providerAttemptCount: evidenceCountSchema,
					statusCounts: z.record(
						z.string().min(1).max(64),
						evidenceCountSchema,
					),
					tokenTotals: z
						.object({
							input: nullableEvidenceCountSchema,
							output: nullableEvidenceCountSchema,
						})
						.strict(),
					maxTokensPerAttempt: z
						.object({
							input: nullableEvidenceCountSchema,
							output: nullableEvidenceCountSchema,
						})
						.strict(),
					issueTotals: z
						.object({
							ambiguous: evidenceCountSchema,
							unreadable: evidenceCountSchema,
							unsupported: evidenceCountSchema,
						})
						.strict()
						.nullable(),
					outcomes: z
						.object({
							applied: evidenceCountSchema,
							accepted: evidenceCountSchema,
							acceptedWithEdits: evidenceCountSchema,
							rejected: evidenceCountSchema,
							saveFailures: evidenceCountSchema,
							unsafeSelectionFeedback: evidenceCountSchema,
						})
						.strict(),
					providerLatency: durationSummarySchema,
					correction: durationSummarySchema,
					semanticViolations: z
						.object({
							acceptedWithoutApply: evidenceCountSchema,
							appliedWithoutFeedback: evidenceCountSchema,
						})
						.strict(),
				})
				.strict(),
			advancement: thresholdEvaluationSchema,
		})
		.strict();

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

/**
 * Validate persisted pilot feedback before it contributes to evidence or
 * comparison metrics. This intentionally covers legacy rows that may predate
 * the current ingress schema.
 */
export function isValidSalesRequestPilotFeedback(
	row: SalesRequestPilotEvidenceRow,
) {
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
	return salesRequestPilotThresholdPolicySchema.safeParse(value).success;
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
	if (
		rows.some(
			(row) =>
				typeof row.status !== "string" ||
				!knownStatuses.has(row.status) ||
				row.status === "unknown",
		)
	) {
		reviewBlockers.push("unknown-status");
	}

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
	const feedbackRows = succeededRows.filter(isValidSalesRequestPilotFeedback);
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
		appliedWithoutFeedback: appliedRows.filter(
			(row) => !isValidSalesRequestPilotFeedback(row),
		).length,
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
	if (
		!salesRequestPilotEvidenceSignoffSchema.safeParse(input.signoff).success
	) {
		return notEvaluable("invalid-signoff");
	}
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
