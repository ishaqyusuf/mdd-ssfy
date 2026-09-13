import { describe, expect, test } from "bun:test";
import { deriveSalesRequestPilotEvidence } from "../../services/sales-request-pilot-evidence";
import {
	createSalesRequestPilotAuthorityDigest,
	createSalesRequestPilotEvidenceDigest,
	createSalesRequestPilotEvidenceSignoff,
	createSalesRequestPilotReviewEvidenceRecord,
	createSalesRequestPilotReviewPolicyDigest,
} from "../../services/sales-request-pilot-review";
import {
	getLatestSalesRequestPilotReviewDecisions,
	recordSalesRequestPilotReviewDecision,
} from "./sales-request-pilot-review";

const baseAuthority = {
	scope: "sales-settings:7",
	configurationRevision: "a".repeat(64),
	provider: "deepseek",
	model: "deepseek-v4-flash",
	promptVersion: "new-sales-form-seed-v6",
	schemaVersion: 2,
	pilotSettingsRevision: 3,
	providerBenchmarkApprovalRevision: 4,
};
const thresholdPolicy = {
	policyVersion: "pilot-gates-v1",
	minimumSucceededRuns: 1,
	minimumAppliedRuns: 1,
	maxProviderP95Ms: 20_000,
	maxInputTokensPerAttempt: 50_000,
	maxOutputTokensPerAttempt: 4_000,
	pricingCurrency: "USD",
	pricingEffectiveAt: "2026-09-01T00:00:00.000Z",
	pricingEvidenceDigest: `sha256:${"a".repeat(64)}`,
	inputPriceMicrosPerMillionTokens: 440_000,
	outputPriceMicrosPerMillionTokens: 1_320_000,
	maxEstimatedPeriodCostMicros: 250_000,
	manualBaselineRequestFamily: "mixed-door-orders-v1",
	manualBaselineMeasuredAt: "2026-09-01T00:00:00.000Z",
	manualBaselineSampleCount: 10,
	manualBaselineEvidenceDigest: `sha256:${"b".repeat(64)}`,
	manualCorrectionBaselineP95Ms: 300_000,
	maxUnsafeSelectionFeedbackCount: 0,
	maxUnsafeApplyCount: 0,
	minimumSaveReopenChecks: 5,
};
const authority = {
	...baseAuthority,
	authorityDigest: createSalesRequestPilotAuthorityDigest(baseAuthority),
	thresholdPolicyVersion: thresholdPolicy.policyVersion,
	thresholdPolicyDigest: createSalesRequestPilotReviewPolicyDigest({
		provider: baseAuthority.provider,
		model: baseAuthority.model,
		thresholds: thresholdPolicy,
	}),
};
const baseEvidence = deriveSalesRequestPilotEvidence(
	[
		{
			status: "succeeded",
			completedAt: new Date("2026-09-02T12:00:30.000Z"),
			providerAttemptedAt: new Date("2026-09-02T12:00:01.000Z"),
			providerLatencyMs: 5_000,
			inputTokens: 1_000,
			outputTokens: 200,
			issueCounts: { ambiguous: 0, unreadable: 0, unsupported: 0 },
			applyOutcome: "applied",
			saveDraftOutcome: "saved",
			feedbackOutcome: "accepted-with-edits",
			feedbackIssueCategories: [],
			feedbackChangedFieldCategories: ["line-items"],
			correctionMs: 20_000,
		},
	],
	{
		collection: {
			periodClosed: true,
			retentionWindowAvailable: true,
			sourceTruncated: false,
		},
	},
);

function storedRow(input: {
	periodStart: string;
	periodEnd: string;
	reviewedAt: string;
}) {
	const evidence = createSalesRequestPilotReviewEvidenceRecord({
		periodStart: input.periodStart,
		periodEnd: input.periodEnd,
		evidence: baseEvidence,
	});
	const evidenceDigest = createSalesRequestPilotEvidenceDigest(evidence);
	const signoff = {
		status: "verified" as const,
		reviewerUserId: 42,
		reviewedAt: input.reviewedAt,
		evidenceDigest,
		authorityMatched: true,
		benchmarkPassed: true,
		unsafeApplyCount: 0,
		ambiguousUnsupportedFactCount: 2,
		ambiguousUnsupportedVisibleCount: 2,
		saveReopenCheckedCount: 5,
		saveReopenSucceededCount: 5,
	};
	return {
		periodStart: new Date(`${input.periodStart}T00:00:00.000Z`),
		periodEnd: new Date(`${input.periodEnd}T00:00:00.000Z`),
		decision: "pass",
		authority: baseAuthority,
		authorityDigest: authority.authorityDigest,
		evidence,
		evidenceDigest,
		thresholdPolicy,
		thresholdPolicyDigest: authority.thresholdPolicyDigest,
		thresholdPolicyVersion: authority.thresholdPolicyVersion,
		signoff,
		reviewerUserId: 42,
		reviewedAt: new Date(input.reviewedAt),
	};
}

describe("sales request pilot review persistence", () => {
	test("canonicalizes reviewer time to database second precision", () => {
		expect(
			createSalesRequestPilotEvidenceSignoff({
				reviewerUserId: 42,
				reviewedAt: new Date("2026-09-08T12:00:00.987Z"),
				evidenceDigest: `sha256:${"e".repeat(64)}`,
				authorityMatched: true,
				values: {
					unsafeApplyCount: 0,
					ambiguousUnsupportedFactCount: 0,
					ambiguousUnsupportedVisibleCount: 0,
					saveReopenCheckedCount: 1,
					saveReopenSucceededCount: 1,
				},
			}).reviewedAt,
		).toBe("2026-09-08T12:00:00.000Z");
	});

	test("writes aggregate-only immutable evidence with base authority identity", async () => {
		let written: Record<string, unknown> | undefined;
		const row = storedRow({
			periodStart: "2026-09-01",
			periodEnd: "2026-09-08",
			reviewedAt: "2026-09-08T12:00:00.000Z",
		});
		const db = {
			salesRequestPilotReviewDecision: {
				create: async ({ data }: { data: Record<string, unknown> }) => {
					written = data;
					return data as never;
				},
				findMany: async () => [],
			},
		};
		await recordSalesRequestPilotReviewDecision(db, {
			settingId: 7,
			periodStart: row.periodStart,
			periodEnd: row.periodEnd,
			decision: "pass",
			authority,
			evidence: row.evidence,
			evidenceDigest: row.evidenceDigest,
			thresholdPolicy,
			signoff: row.signoff,
		});

		expect(written).toMatchObject({
			settingId: 7,
			decision: "pass",
			authority: baseAuthority,
			authorityDigest: authority.authorityDigest,
			thresholdPolicyDigest: authority.thresholdPolicyDigest,
			thresholdPolicyVersion: authority.thresholdPolicyVersion,
			reviewerUserId: 42,
		});
		expect(written?.authority).not.toHaveProperty("authorityDigest");
		expect(JSON.stringify(written)).not.toMatch(
			/requestText|providerResponse|email|phone|image/i,
		);
	});

	test("returns only the latest two decisions in ascending period order", async () => {
		let query: Record<string, unknown> | undefined;
		const rows = [
			storedRow({
				periodStart: "2026-09-08",
				periodEnd: "2026-09-15",
				reviewedAt: "2026-09-15T12:00:00.000Z",
			}),
			storedRow({
				periodStart: "2026-09-01",
				periodEnd: "2026-09-08",
				reviewedAt: "2026-09-08T12:00:00.000Z",
			}),
		];
		const db = {
			salesRequestPilotReviewDecision: {
				create: async () => rows[0] as never,
				findMany: async (input: Record<string, unknown>) => {
					query = input;
					return rows;
				},
			},
		};
		const result = await getLatestSalesRequestPilotReviewDecisions(db, 7);

		expect(query).toMatchObject({
			where: { settingId: 7 },
			orderBy: { periodStart: "desc" },
			take: 2,
		});
		expect(result.map(({ periodStart }) => periodStart)).toEqual([
			"2026-09-01",
			"2026-09-08",
		]);
	});

	test("rejects malformed persisted authority rather than casting it", async () => {
		const row = storedRow({
			periodStart: "2026-09-01",
			periodEnd: "2026-09-08",
			reviewedAt: "2026-09-08T12:00:00.000Z",
		});
		const db = {
			salesRequestPilotReviewDecision: {
				create: async () => ({}) as never,
				findMany: async () => [
					{ ...row, authority: { ...baseAuthority, scope: "" } },
				],
			},
		};

		await expect(
			getLatestSalesRequestPilotReviewDecisions(db, 7),
		).rejects.toBeDefined();
	});

	test("rejects persisted evidence whose digest was changed", async () => {
		const row = storedRow({
			periodStart: "2026-09-01",
			periodEnd: "2026-09-08",
			reviewedAt: "2026-09-08T12:00:00.000Z",
		});
		const db = {
			salesRequestPilotReviewDecision: {
				create: async () => row as never,
				findMany: async () => [
					{ ...row, evidenceDigest: `sha256:${"f".repeat(64)}` },
				],
			},
		};

		await expect(
			getLatestSalesRequestPilotReviewDecisions(db, 7),
		).rejects.toThrow("integrity checks");
	});

	test("rejects private aliases and impossible decisions at the persistence boundary", async () => {
		const row = storedRow({
			periodStart: "2026-09-01",
			periodEnd: "2026-09-08",
			reviewedAt: "2026-09-08T12:00:00.000Z",
		});
		const db = {
			salesRequestPilotReviewDecision: {
				create: async () => row as never,
				findMany: async () => [],
			},
		};
		await expect(
			recordSalesRequestPilotReviewDecision(db, {
				settingId: 7,
				periodStart: row.periodStart,
				periodEnd: row.periodEnd,
				decision: "pass",
				authority,
				evidence: {
					...row.evidence,
					evidence: {
						...row.evidence.evidence,
						customerName: "must-not-persist",
					},
				} as never,
				evidenceDigest: row.evidenceDigest,
				thresholdPolicy,
				signoff: row.signoff,
			}),
		).rejects.toBeDefined();

		await expect(
			recordSalesRequestPilotReviewDecision(db, {
				settingId: 7,
				periodStart: row.periodStart,
				periodEnd: row.periodEnd,
				decision: "fail",
				authority,
				evidence: row.evidence,
				evidenceDigest: row.evidenceDigest,
				thresholdPolicy,
				signoff: row.signoff,
			}),
		).rejects.toThrow("integrity checks");
	});
});
