import { describe, expect, test } from "bun:test";
import {
	type SalesRequestPilotCurrentAuthority,
	type SalesRequestPilotPeriodDecision,
	evaluateSalesRequestPilotAdvancement,
} from "./sales-request-pilot-advancement";

const authorityIdentity = {
	scope: "sales-settings:7",
	configurationRevision: "a".repeat(64),
	provider: "deepseek",
	model: "deepseek-v4-flash",
	promptVersion: "new-sales-form-seed-v6",
	schemaVersion: 2,
	pilotSettingsRevision: 3,
	providerBenchmarkApprovalRevision: 4,
} as const;

const currentAuthority: SalesRequestPilotCurrentAuthority = {
	...authorityIdentity,
	authorityDigest: `sha256:${"d".repeat(64)}`,
	thresholdPolicyVersion: "pilot-gates-v1",
	thresholdPolicyDigest: `sha256:${"f".repeat(64)}`,
};

function period(
	overrides: Partial<SalesRequestPilotPeriodDecision> = {},
): SalesRequestPilotPeriodDecision {
	return {
		periodStart: "2026-09-01",
		periodEnd: "2026-09-08",
		authority: { ...authorityIdentity },
		authorityDigest: currentAuthority.authorityDigest,
		evidenceDigest: `sha256:${"e".repeat(64)}`,
		decision: "pass",
		reviewedAt: "2026-09-08T12:00:00.000Z",
		reviewerUserId: 42,
		thresholdPolicyVersion: currentAuthority.thresholdPolicyVersion,
		thresholdPolicyDigest: currentAuthority.thresholdPolicyDigest,
		...overrides,
	};
}

function adjacentPeriods(
	firstOverrides: Partial<SalesRequestPilotPeriodDecision> = {},
	secondOverrides: Partial<SalesRequestPilotPeriodDecision> = {},
) {
	return [
		period(firstOverrides),
		period({
			periodStart: "2026-09-08",
			periodEnd: "2026-09-15",
			reviewedAt: "2026-09-15T12:00:00.000Z",
			...secondOverrides,
		}),
	] as const;
}

function evaluate(
	periodDecisions: readonly SalesRequestPilotPeriodDecision[],
	current = currentAuthority,
) {
	return evaluateSalesRequestPilotAdvancement({
		periodDecisions,
		currentAuthority: current,
	});
}

describe("sales request pilot consecutive-period advancement", () => {
	test("allows exactly two adjacent passing UTC periods under one authority", () => {
		expect(evaluate(adjacentPeriods())).toEqual({
			eligible: true,
			blockers: [],
		});
	});

	test("requires exactly two periods and resets missing or extra sequences", () => {
		for (const periodDecisions of [
			[],
			[period()],
			[
				...adjacentPeriods(),
				period({ periodStart: "2026-09-15", periodEnd: "2026-09-22" }),
			],
		]) {
			expect(evaluate(periodDecisions)).toEqual({
				eligible: false,
				blockers: ["exactly-two-periods-required"],
			});
		}
	});

	test("rejects gaps, overlaps, and reversed period order", () => {
		const cases = [
			{
				periods: adjacentPeriods(
					{},
					{
						periodStart: "2026-09-09",
						periodEnd: "2026-09-16",
					},
				),
				blocker: "periods-not-adjacent",
			},
			{
				periods: adjacentPeriods(
					{},
					{
						periodStart: "2026-09-07",
						periodEnd: "2026-09-14",
					},
				),
				blocker: "periods-not-adjacent",
			},
			{
				periods: [
					period({
						periodStart: "2026-09-08",
						periodEnd: "2026-09-15",
						reviewedAt: "2026-09-15T12:00:00.000Z",
					}),
					period(),
				],
				blocker: "periods-not-ascending",
			},
		] as const;

		for (const { periods, blocker } of cases) {
			const result = evaluate(periods);
			expect(result.eligible).toBe(false);
			expect(result.blockers).toContain(blocker);
		}
	});

	test("requires each period to be exactly seven days", () => {
		const result = evaluate(adjacentPeriods({ periodEnd: "2026-09-07" }));

		expect(result).toEqual({
			eligible: false,
			blockers: ["period-window-invalid", "periods-not-adjacent"],
		});
	});

	test("resets when either period decision fails", () => {
		const result = evaluate(adjacentPeriods({}, { decision: "fail" }));

		expect(result).toEqual({
			eligible: false,
			blockers: ["period-failed"],
		});
	});

	test("requires the same authority identity across both periods and now", () => {
		const authorityFields = [
			"scope",
			"configurationRevision",
			"provider",
			"model",
			"promptVersion",
			"schemaVersion",
			"pilotSettingsRevision",
			"providerBenchmarkApprovalRevision",
		] as const;

		for (const field of authorityFields) {
			const changedAuthority = {
				...authorityIdentity,
				[field]:
					typeof authorityIdentity[field] === "number"
						? authorityIdentity[field] + 1
						: `${authorityIdentity[field]}-changed`,
			};
			const result = evaluate(
				adjacentPeriods({ authority: changedAuthority }),
				currentAuthority,
			);

			expect(result.eligible).toBe(false);
			expect(result.blockers).toContain("authority-identity-mismatch");
		}
	});

	test("requires one authority digest and threshold policy for both periods", () => {
		const digestMismatch = evaluate(
			adjacentPeriods(
				{},
				{
					authorityDigest: `sha256:${"f".repeat(64)}`,
				},
			),
		);
		const policyMismatch = evaluate(
			adjacentPeriods({}, { thresholdPolicyVersion: "pilot-gates-v2" }),
		);
		const policyDigestMismatch = evaluate(
			adjacentPeriods(
				{},
				{ thresholdPolicyDigest: `sha256:${"a".repeat(64)}` },
			),
		);

		expect(digestMismatch).toEqual({
			eligible: false,
			blockers: ["authority-digest-mismatch"],
		});
		expect(policyMismatch).toEqual({
			eligible: false,
			blockers: ["threshold-policy-mismatch"],
		});
		expect(policyDigestMismatch).toEqual({
			eligible: false,
			blockers: ["threshold-policy-digest-mismatch"],
		});
	});

	test("rejects invalid or missing durable decision fields fail-closed", () => {
		const result = evaluate([
			period({
				periodStart: "2026-09-01",
				periodEnd: "not-a-date",
				authorityDigest: "not-a-digest",
				evidenceDigest: "not-a-digest",
				reviewedAt: "not-a-date",
				reviewerUserId: 0,
				thresholdPolicyVersion: "",
			}),
			period({
				periodStart: "2026-09-08",
				periodEnd: "2026-09-15",
				reviewedAt: "2026-09-15T12:00:00.000Z",
			}),
		]);

		expect(result).toEqual({
			eligible: false,
			blockers: [
				"period-window-invalid",
				"reviewer-invalid",
				"reviewed-at-invalid",
				"authority-digest-invalid",
				"authority-digest-mismatch",
				"evidence-digest-invalid",
				"threshold-policy-invalid",
				"threshold-policy-mismatch",
			],
		});
	});

	test("rejects reviews recorded before a period closes", () => {
		const result = evaluate(
			adjacentPeriods({ reviewedAt: "2026-09-07T23:59:59.000Z" }),
		);

		expect(result).toEqual({
			eligible: false,
			blockers: ["review-before-period-end"],
		});
	});

	test("requires a current authority and keeps blockers deterministic", () => {
		expect(
			evaluateSalesRequestPilotAdvancement({
				periodDecisions: adjacentPeriods(),
				currentAuthority: null,
			}),
		).toEqual({
			eligible: false,
			blockers: ["current-authority-unavailable"],
		});

		const malformed = evaluateSalesRequestPilotAdvancement({
			periodDecisions: [
				period({ periodStart: "invalid", decision: "fail" }),
				period({ periodStart: "invalid", decision: "fail" }),
			],
			currentAuthority,
		});
		const repeated = evaluateSalesRequestPilotAdvancement({
			periodDecisions: [
				period({ periodStart: "invalid", decision: "fail" }),
				period({ periodStart: "invalid", decision: "fail" }),
			],
			currentAuthority,
		});

		expect(malformed).toEqual(repeated);
		expect(malformed.eligible).toBe(false);
		expect(malformed.blockers).toContain("period-failed");
	});
});
