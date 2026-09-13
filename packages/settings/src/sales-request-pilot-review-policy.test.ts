import { describe, expect, test } from "bun:test";
import {
	type SalesRequestPilotReviewPolicy,
	getSalesRequestPilotReviewPolicy,
	salesRequestPilotReviewPolicyInputSchema,
	updateSalesRequestPilotReviewPolicy,
} from "./sales-request-pilot-review-policy";

const settingId = 7;
const digest = `sha256:${"d".repeat(64)}`;
const changedAt = new Date("2026-09-13T12:00:00.000Z");
const thresholds = {
	policyVersion: "pilot-gates-v1",
	minimumSucceededRuns: 10,
	minimumAppliedRuns: 5,
	maxProviderP95Ms: 20_000,
	maxInputTokensPerAttempt: 50_000,
	maxOutputTokensPerAttempt: 4_000,
	pricingCurrency: "USD",
	pricingEffectiveAt: "2026-09-13T00:00:00.000Z",
	pricingEvidenceDigest: `sha256:${"a".repeat(64)}`,
	inputPriceMicrosPerMillionTokens: 440_000,
	outputPriceMicrosPerMillionTokens: 1_320_000,
	maxEstimatedPeriodCostMicros: 250_000,
	manualBaselineRequestFamily: "mixed-door-orders-v1",
	manualBaselineMeasuredAt: "2026-09-13T00:00:00.000Z",
	manualBaselineSampleCount: 10,
	manualBaselineEvidenceDigest: `sha256:${"b".repeat(64)}`,
	manualCorrectionBaselineP95Ms: 300_000,
	maxUnsafeSelectionFeedbackCount: 0,
	maxUnsafeApplyCount: 0,
	minimumSaveReopenChecks: 5,
} as const;

function existingMeta(extra: Record<string, unknown> = {}) {
	return {
		unrelated: { preserved: true },
		requestGeneration: {
			ai: { provider: "deepseek", model: "deepseek-v4-flash" },
			pilot: {
				enabled: true,
				cohortUserIds: [19],
				reviewerUserIds: [42],
				revision: 3,
				changedAt: "2026-09-12T12:00:00.000Z",
			},
			...extra,
		},
	};
}

function fakeDatabase(initialMeta: unknown) {
	let meta = initialMeta;
	let updateCount = 0;
	const settings = {
		findFirst: async () => ({ id: settingId, meta }),
		update: async ({ data }: { data: { meta: unknown } }) => {
			updateCount += 1;
			meta = data.meta;
		},
	};
	const tx = {
		$queryRaw: async () => [{ id: settingId }],
		settings,
	};
	const db = {
		settings,
		$transaction: async (
			callback: (client: typeof tx) => Promise<unknown>,
			options: unknown,
		) => {
			expect(options).toEqual({
				isolationLevel: "Serializable",
				timeout: 60_000,
			});
			return callback(tx);
		},
	};
	return {
		db: db as unknown as Parameters<
			typeof updateSalesRequestPilotReviewPolicy
		>[0],
		getDb: db as unknown as Parameters<
			typeof getSalesRequestPilotReviewPolicy
		>[0],
		getMeta: () => meta,
		getUpdateCount: () => updateCount,
	};
}

const verifyDigest = async (input: { digest: string }) => {
	expect(input.digest).toBe(digest);
};

function persistedPolicy(
	overrides: Partial<SalesRequestPilotReviewPolicy> = {},
): SalesRequestPilotReviewPolicy {
	return {
		provider: "deepseek",
		model: "deepseek-v4-flash",
		thresholds,
		digest,
		revision: 1,
		changedAt: changedAt.toISOString(),
		changedByUserId: 19,
		...overrides,
	};
}

describe("sales request pilot review policy", () => {
	test("fails closed when the policy is missing or malformed", async () => {
		await expect(
			getSalesRequestPilotReviewPolicy(
				fakeDatabase(existingMeta()).getDb,
				settingId,
			),
		).resolves.toMatchObject({ policy: null, source: "missing" });
		await expect(
			getSalesRequestPilotReviewPolicy(
				fakeDatabase(existingMeta({ pilotReviewPolicy: { digest: "invalid" } }))
					.getDb,
				settingId,
			),
		).resolves.toMatchObject({ policy: null, source: "invalid" });
	});

	test("strictly validates bounded UTC policy evidence", () => {
		expect(
			salesRequestPilotReviewPolicyInputSchema.safeParse({
				provider: "deepseek",
				model: "deepseek-v4-flash",
				thresholds,
			}).success,
		).toBe(true);
		expect(
			salesRequestPilotReviewPolicyInputSchema.safeParse({
				provider: "deepseek",
				model: "deepseek-v4-flash",
				thresholds: { ...thresholds, pricingEffectiveAt: "2026-09-13" },
			}).success,
		).toBe(false);
	});

	test("locks, verifies, deep-merges, and invalidates prior pilot authority", async () => {
		const fixture = fakeDatabase(existingMeta({ defaultsVersion: 3 }));
		const result = await updateSalesRequestPilotReviewPolicy(
			fixture.db,
			{
				settingId,
				provider: "deepseek",
				model: "deepseek-v4-flash",
				thresholds,
				digest,
				changedByUserId: 19,
				changedAt,
			},
			verifyDigest,
		);

		expect(result).toEqual({
			changed: true,
			settingId,
			policy: persistedPolicy(),
			source: "persisted",
		});
		expect(fixture.getMeta()).toMatchObject({
			unrelated: { preserved: true },
			requestGeneration: {
				defaultsVersion: 3,
				pilot: { revision: 4, changedAt: changedAt.toISOString() },
				pilotReviewPolicy: persistedPolicy(),
			},
		});
		expect(fixture.getUpdateCount()).toBe(1);
	});

	test("does not rewrite an identical digest", async () => {
		const fixture = fakeDatabase(
			existingMeta({ pilotReviewPolicy: persistedPolicy() }),
		);
		const result = await updateSalesRequestPilotReviewPolicy(
			fixture.db,
			{
				settingId,
				provider: "deepseek",
				model: "deepseek-v4-flash",
				thresholds,
				digest,
				changedByUserId: 19,
			},
			verifyDigest,
		);
		expect(result.changed).toBe(false);
		expect(fixture.getUpdateCount()).toBe(0);
	});

	test("requires a new policy version when threshold evidence changes", async () => {
		const fixture = fakeDatabase(
			existingMeta({ pilotReviewPolicy: persistedPolicy() }),
		);
		await expect(
			updateSalesRequestPilotReviewPolicy(
				fixture.db,
				{
					settingId,
					provider: "deepseek",
					model: "deepseek-v4-flash",
					thresholds: { ...thresholds, minimumSucceededRuns: 11 },
					digest: `sha256:${"e".repeat(64)}`,
					changedByUserId: 19,
				},
				async () => {},
			),
		).rejects.toThrow("Increment the pilot review policy version");
		expect(fixture.getUpdateCount()).toBe(0);
	});

	test("rejects stale selection or an unverified digest before persistence", async () => {
		const stale = fakeDatabase({
			...existingMeta(),
			requestGeneration: {
				...(existingMeta().requestGeneration as Record<string, unknown>),
				ai: { provider: "openai", model: "gpt-5-mini" },
			},
		});
		await expect(
			updateSalesRequestPilotReviewPolicy(
				stale.db,
				{
					settingId,
					provider: "deepseek",
					model: "deepseek-v4-flash",
					thresholds,
					digest,
					changedByUserId: 19,
				},
				verifyDigest,
			),
		).rejects.toThrow("must match the active");

		const unverified = fakeDatabase(existingMeta());
		await expect(
			updateSalesRequestPilotReviewPolicy(
				unverified.db,
				{
					settingId,
					provider: "deepseek",
					model: "deepseek-v4-flash",
					thresholds,
					digest,
					changedByUserId: 19,
				},
				async () => {
					throw new Error("unverified digest");
				},
			),
		).rejects.toThrow("unverified digest");
		expect(unverified.getUpdateCount()).toBe(0);
	});
});
