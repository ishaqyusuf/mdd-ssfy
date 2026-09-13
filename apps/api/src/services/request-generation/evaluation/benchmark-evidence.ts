import { createHash } from "node:crypto";
import { z } from "zod";
import { salesRequestEvaluationApprovalPacketSchema } from "./approval";
import { salesRequestCorpusFactExpectationsSchema } from "./corpus";

export const SALES_REQUEST_BENCHMARK_EVIDENCE_VERSION = 1 as const;

const sha256DigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const isoUtcSchema = z.string().datetime({ offset: false }).regex(/Z$/);
const boundedTokenSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);

const reviewedFactSchema = z
	.object({
		factId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
		provider: z.enum(["correct", "incorrect", "not-produced"]),
		normalized: z.enum(["correct", "incorrect", "not-produced"]),
		safety: z.enum(["safe", "unsafe"]),
	})
	.strict();

export const salesRequestBenchmarkHumanReviewSchema = z
	.object({
		schemaVersion: z.literal(1),
		status: z.literal("completed"),
		runId: boundedTokenSchema,
		caseId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
		provider: z.enum(["openai", "anthropic", "deepseek", "google"]),
		model: z.string().trim().min(1).max(160),
		reviewerUserId: z.number().int().positive(),
		reviewedAt: isoUtcSchema,
		decision: z.enum(["continue", "stop"]),
		factReviews: z.array(reviewedFactSchema).min(1).max(500),
		correction: z
			.object({
				method: z.enum(["none", "native-form"]),
				durationMs: z.number().int().min(0).max(86_400_000),
				changedFieldCategories: z.array(boundedTokenSchema).max(12).default([]),
			})
			.strict(),
		nativeSaveReopen: z.enum(["passed", "blocked"]),
		stopReasons: z.array(boundedTokenSchema).max(12).default([]),
	})
	.strict()
	.superRefine((review, context) => {
		const ids = new Set<string>();
		for (const [index, fact] of review.factReviews.entries()) {
			if (ids.has(fact.factId)) {
				context.addIssue({
					code: "custom",
					path: ["factReviews", index, "factId"],
					message: "Each fact must be reviewed exactly once",
				});
			}
			ids.add(fact.factId);
		}
		if (
			review.correction.method === "none" &&
			(review.correction.durationMs !== 0 ||
				review.correction.changedFieldCategories.length !== 0)
		) {
			context.addIssue({
				code: "custom",
				path: ["correction"],
				message: "A no-correction review must record zero time and no fields",
			});
		}
		if (
			review.correction.method === "native-form" &&
			(review.correction.durationMs <= 0 ||
				review.correction.changedFieldCategories.length === 0)
		) {
			context.addIssue({
				code: "custom",
				path: ["correction"],
				message:
					"A native-form correction requires positive time and changed-field categories",
			});
		}
		if (review.decision === "stop" && review.stopReasons.length === 0) {
			context.addIssue({
				code: "custom",
				path: ["stopReasons"],
				message: "A stopped benchmark requires at least one bounded reason",
			});
		}
		if (review.decision === "continue" && review.stopReasons.length !== 0) {
			context.addIssue({
				code: "custom",
				path: ["stopReasons"],
				message: "A continuing benchmark cannot include stop reasons",
			});
		}
	});

export type SalesRequestBenchmarkHumanReview = z.infer<
	typeof salesRequestBenchmarkHumanReviewSchema
>;

const metricBucketSchema = z
	.object({
		expected: z.number().int().nonnegative(),
		matched: z.number().int().nonnegative(),
		matchRate: z.number().min(0).max(1).nullable(),
	})
	.strict();

const factStageMetricsSchema = z
	.object({
		all: metricBucketSchema,
		supportedAccuracy: metricBucketSchema,
		ambiguousUnsupportedContainment: metricBucketSchema,
		byClassification: z.record(z.string(), metricBucketSchema),
		byFamily: z.record(z.string(), metricBucketSchema),
	})
	.passthrough();

const successfulMetricsSchema = z
	.object({
		latencyMs: z.number().nonnegative(),
		inputTokens: z.number().int().nonnegative().nullable(),
		outputTokens: z.number().int().nonnegative().nullable(),
		factExpectations: z
			.object({
				provider: factStageMetricsSchema,
				seed: factStageMetricsSchema,
			})
			.strict(),
		providerOracle: z
			.object({
				wholeOrderMatch: z.boolean(),
				unsafeGuesses: z.number().int().nonnegative(),
			})
			.passthrough()
			.nullable(),
		seedOracle: z
			.object({
				wholeOrderMatch: z.boolean(),
				unsafeGuesses: z.number().int().nonnegative(),
			})
			.passthrough()
			.nullable(),
	})
	.passthrough();

const failedMetricsSchema = z
	.object({
		latencyMs: z.number().nonnegative(),
		providerFailure: z.unknown().optional(),
	})
	.passthrough();

const metricsSchema = z.union([successfulMetricsSchema, failedMetricsSchema]);

const validationSchema = z.union([
	z
		.object({
			status: z.enum(["passed", "review-required"]),
			facts: z.enum(["passed", "failed"]),
			normalization: z.literal("passed"),
			initializer: z.enum(["passed", "blocked"]),
			saveReopen: z.enum(["passed", "blocked"]),
			issues: z.array(z.string()),
		})
		.strict(),
	z
		.object({
			status: z.literal("failed"),
			error: z.string().min(1),
			hydration: z.literal("not-run"),
		})
		.strict(),
]);

const costSchema = z
	.object({
		status: z.enum(["within-ceiling", "ceiling-exceeded", "not-evaluable"]),
		evaluable: z.boolean(),
		minimumCostMicros: z.number().int().nonnegative().nullable(),
		maximumCostMicros: z.number().int().nonnegative().nullable(),
		withinCeiling: z.boolean().nullable(),
	})
	.passthrough();

export const salesRequestBenchmarkFinalEvidenceSchema = z
	.object({
		schemaVersion: z.literal(SALES_REQUEST_BENCHMARK_EVIDENCE_VERSION),
		status: z.literal("finalized"),
		scope: z
			.object({
				runId: boundedTokenSchema,
				caseId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
				provider: z.enum(["openai", "anthropic", "deepseek", "google"]),
				model: z.string().trim().min(1).max(160),
				approvalDigest: sha256DigestSchema,
				configurationRevision: z.string().regex(/^[a-f0-9]{64}$/),
				promptVersion: boundedTokenSchema,
				outputContract: z.literal("new-sales-form-seed-v2"),
				pricingEffectiveAt: z.string().date(),
				pricingCurrency: z.string().regex(/^[A-Z]{3}$/),
			})
			.strict(),
		review: z
			.object({
				reviewerUserId: z.number().int().positive(),
				reviewedAt: isoUtcSchema,
				decision: z.enum(["continue", "stop"]),
				correctionMs: z.number().int().nonnegative(),
				unsafeFactCount: z.number().int().nonnegative(),
				nativeSaveReopen: z.enum(["passed", "blocked"]),
			})
			.strict(),
		metrics: z
			.object({
				providerSupportedAccuracy: metricBucketSchema.nullable(),
				normalizedSupportedAccuracy: metricBucketSchema.nullable(),
				providerAmbiguityContainment: metricBucketSchema.nullable(),
				normalizedAmbiguityContainment: metricBucketSchema.nullable(),
				providerWholeOrderMatch: z.boolean().nullable(),
				normalizedWholeOrderMatch: z.boolean().nullable(),
				providerUnsafeGuesses: z.number().int().nonnegative().nullable(),
				normalizedUnsafeGuesses: z.number().int().nonnegative().nullable(),
				latencyMs: z.number().nonnegative(),
				inputTokens: z.number().int().nonnegative().nullable(),
				outputTokens: z.number().int().nonnegative().nullable(),
				minimumCostMicros: z.number().int().nonnegative().nullable(),
				maximumCostMicros: z.number().int().nonnegative().nullable(),
				withinCostCeiling: z.boolean().nullable(),
			})
			.strict(),
		artifactSha256: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
		evidenceDigest: sha256DigestSchema,
	})
	.strict();

export type SalesRequestBenchmarkFinalEvidence = z.infer<
	typeof salesRequestBenchmarkFinalEvidenceSchema
>;

function sha256(value: string) {
	return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value: unknown): string {
	if (value === undefined) return "undefined";
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
		.join(",")}}`;
}

function parseArtifact(contents: Record<string, string>, path: string) {
	const value = contents[path];
	if (value === undefined)
		throw new Error(`Missing benchmark artifact: ${path}`);
	try {
		return JSON.parse(value) as unknown;
	} catch {
		throw new Error(`Invalid benchmark JSON artifact: ${path}`);
	}
}

function assertIdentity(
	actual: Record<string, unknown>,
	expected: { runId: string; caseId: string; provider: string; model: string },
	label: string,
) {
	for (const key of ["runId", "caseId", "provider", "model"] as const) {
		if (actual[key] !== expected[key]) {
			throw new Error(`${label} does not match approved ${key}`);
		}
	}
}

export function finalizeSalesRequestBenchmarkEvidence(input: {
	artifacts: Record<string, string>;
}) {
	const approval = salesRequestEvaluationApprovalPacketSchema.parse(
		parseArtifact(input.artifacts, "approval.json"),
	);
	const scope = approval.scope;
	const identity = {
		runId: scope.runId,
		caseId: scope.caseId,
		provider: scope.provider,
		model: scope.model,
	};
	const consumed = z
		.object({
			schemaVersion: z.literal(1),
			runId: boundedTokenSchema,
			caseId: identity.caseId ? z.literal(identity.caseId) : z.never(),
			provider: z.literal(identity.provider),
			model: z.literal(identity.model),
			approvalDigest: z.literal(approval.approvalDigest),
			approvedCallLimit: z.literal(1),
			consumedAt: isoUtcSchema,
		})
		.strict()
		.parse(parseArtifact(input.artifacts, "approval-consumed.json"));
	assertIdentity(consumed, identity, "Consumed approval");
	const execution = z
		.object({
			schemaVersion: z.literal(1),
			mode: z.literal("live"),
			runId: boundedTokenSchema,
			provider: z.literal(identity.provider),
			model: z.literal(identity.model),
			caseId: z.literal(identity.caseId),
			approvalDigest: z.literal(approval.approvalDigest),
			maxRetries: z.literal(0),
			startedAt: isoUtcSchema,
		})
		.strict()
		.parse(parseArtifact(input.artifacts, "execution.json"));
	assertIdentity(execution, identity, "Execution");
	const review = salesRequestBenchmarkHumanReviewSchema.parse(
		parseArtifact(input.artifacts, `${identity.caseId}/review.json`),
	);
	assertIdentity(review, identity, "Human review");
	const expectations = salesRequestCorpusFactExpectationsSchema.parse(
		parseArtifact(input.artifacts, `${identity.caseId}/fact-expectations.json`),
	);
	const expectedFactIds = expectations.facts.map(({ id }) => id).sort();
	const reviewedFactIds = review.factReviews.map(({ factId }) => factId).sort();
	if (stableStringify(expectedFactIds) !== stableStringify(reviewedFactIds)) {
		throw new Error("Human review must cover every expected fact exactly once");
	}
	const metrics = metricsSchema.parse(
		parseArtifact(input.artifacts, `${identity.caseId}/metrics.json`),
	);
	const successfulMetrics = successfulMetricsSchema.safeParse(metrics);
	const successfulMetricsValue = successfulMetrics.success
		? successfulMetrics.data
		: null;
	const validation = validationSchema.parse(
		parseArtifact(input.artifacts, `${identity.caseId}/validation.json`),
	);
	const cost = costSchema.parse(
		parseArtifact(input.artifacts, `${identity.caseId}/cost-estimate.json`),
	);
	const providerReturnPath = `${identity.caseId}/provider-return.json`;
	if (
		successfulMetricsValue &&
		input.artifacts[providerReturnPath] === undefined
	) {
		throw new Error(
			"Successful benchmark evidence requires a durable provider return",
		);
	}
	if (input.artifacts[providerReturnPath] !== undefined) {
		const providerReturn = z
			.object({
				schemaVersion: z.literal(1),
				receivedAt: isoUtcSchema,
				provider: z.literal(identity.provider),
				model: z.literal(identity.model),
				inputTokens: z.number().int().nonnegative().nullable(),
				outputTokens: z.number().int().nonnegative().nullable(),
				output: z.unknown(),
			})
			.strict()
			.parse(parseArtifact(input.artifacts, providerReturnPath));
		const archivedOutput = parseArtifact(
			input.artifacts,
			`${identity.caseId}/provider-output.json`,
		);
		if (
			stableStringify(providerReturn.output) !== stableStringify(archivedOutput)
		) {
			throw new Error(
				"Archived provider output does not match the durable return",
			);
		}
		if (
			successfulMetricsValue &&
			(providerReturn.inputTokens !== successfulMetricsValue.inputTokens ||
				providerReturn.outputTokens !== successfulMetricsValue.outputTokens)
		) {
			throw new Error(
				"Archived benchmark token metrics do not match the durable provider return",
			);
		}
	}
	const successfulValidation =
		validation.status === "failed" ? null : validation;
	if (
		review.decision === "continue" &&
		(!successfulMetricsValue ||
			!successfulValidation ||
			successfulMetricsValue.inputTokens === null ||
			successfulMetricsValue.outputTokens === null ||
			!cost.evaluable ||
			cost.withinCeiling !== true ||
			cost.minimumCostMicros === null ||
			cost.maximumCostMicros === null)
	) {
		throw new Error("Benchmark cost and token evidence must be complete");
	}
	if (
		successfulValidation !== null &&
		review.nativeSaveReopen !== successfulValidation.saveReopen
	) {
		throw new Error("Human review does not match native save/reopen evidence");
	}
	const unsafeFactCount = review.factReviews.filter(
		({ safety }) => safety === "unsafe",
	).length;
	if (
		review.decision === "continue" &&
		(!successfulMetricsValue ||
			!successfulValidation ||
			unsafeFactCount > 0 ||
			successfulValidation.initializer !== "passed" ||
			successfulValidation.saveReopen !== "passed" ||
			(successfulMetricsValue.providerOracle?.unsafeGuesses ?? 0) > 0 ||
			(successfulMetricsValue.seedOracle?.unsafeGuesses ?? 0) > 0)
	) {
		throw new Error(
			"Unsafe or incompatible evidence cannot continue the benchmark",
		);
	}

	for (const [artifactName, digest] of Object.entries(
		approval.artifactSha256,
	)) {
		const paths: Record<string, string> = {
			configuration: "configuration.json",
			configurationSource: "configuration-source.json",
			evaluationRuntimeLock: "evaluation-runtime-lock.json",
			factExpectations: `${identity.caseId}/fact-expectations.json`,
			modelInput: `${identity.caseId}/model-input.json`,
			pricingSnapshot: "pricing-snapshot.json",
			pricingSource: "pricing-source.md",
			providerOracle: `${identity.caseId}/oracle-provider-output.json`,
			providerRuntimeOptions: "provider-runtime-options.json",
			request: `${identity.caseId}/request.json`,
			seedOracle: `${identity.caseId}/oracle-seed.json`,
		};
		const path = paths[artifactName];
		if (!path || sha256(input.artifacts[path] ?? "") !== digest) {
			throw new Error(`Approved artifact changed: ${artifactName}`);
		}
	}

	const artifactSha256 = Object.fromEntries(
		Object.entries(input.artifacts)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([path, value]) => [path, sha256(value)]),
	);
	const unsigned = {
		schemaVersion: SALES_REQUEST_BENCHMARK_EVIDENCE_VERSION,
		status: "finalized" as const,
		scope: {
			runId: identity.runId,
			caseId: identity.caseId,
			provider: identity.provider,
			model: identity.model,
			approvalDigest: approval.approvalDigest,
			configurationRevision: scope.configurationRevision,
			promptVersion: scope.promptVersion,
			outputContract: scope.outputContract,
			pricingEffectiveAt: scope.pricingEffectiveAt,
			pricingCurrency: scope.pricingCurrency,
		},
		review: {
			reviewerUserId: review.reviewerUserId,
			reviewedAt: review.reviewedAt,
			decision: review.decision,
			correctionMs: review.correction.durationMs,
			unsafeFactCount,
			nativeSaveReopen: review.nativeSaveReopen,
		},
		metrics: {
			providerSupportedAccuracy:
				successfulMetricsValue?.factExpectations.provider.supportedAccuracy ??
				null,
			normalizedSupportedAccuracy:
				successfulMetricsValue?.factExpectations.seed.supportedAccuracy ?? null,
			providerAmbiguityContainment:
				successfulMetricsValue?.factExpectations.provider
					.ambiguousUnsupportedContainment ?? null,
			normalizedAmbiguityContainment:
				successfulMetricsValue?.factExpectations.seed
					.ambiguousUnsupportedContainment ?? null,
			providerWholeOrderMatch:
				successfulMetricsValue?.providerOracle?.wholeOrderMatch ?? null,
			normalizedWholeOrderMatch:
				successfulMetricsValue?.seedOracle?.wholeOrderMatch ?? null,
			providerUnsafeGuesses:
				successfulMetricsValue?.providerOracle?.unsafeGuesses ?? null,
			normalizedUnsafeGuesses:
				successfulMetricsValue?.seedOracle?.unsafeGuesses ?? null,
			latencyMs: metrics.latencyMs,
			inputTokens: successfulMetricsValue?.inputTokens ?? null,
			outputTokens: successfulMetricsValue?.outputTokens ?? null,
			minimumCostMicros: cost.minimumCostMicros,
			maximumCostMicros: cost.maximumCostMicros,
			withinCostCeiling: cost.withinCeiling,
		},
		artifactSha256,
	};
	return salesRequestBenchmarkFinalEvidenceSchema.parse({
		...unsigned,
		evidenceDigest: `sha256:${sha256(stableStringify(unsigned))}`,
	});
}

export function verifySalesRequestBenchmarkFinalEvidence(input: {
	artifacts: Record<string, string>;
	finalEvidence: unknown;
}) {
	const parsed = salesRequestBenchmarkFinalEvidenceSchema.parse(
		input.finalEvidence,
	);
	const recreated = finalizeSalesRequestBenchmarkEvidence({
		artifacts: input.artifacts,
	});
	if (stableStringify(parsed) !== stableStringify(recreated)) {
		throw new Error(
			"Final benchmark evidence does not match archived artifacts",
		);
	}
	return recreated;
}
