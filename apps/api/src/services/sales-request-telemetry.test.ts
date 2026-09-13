import { describe, expect, test } from "bun:test";
import {
	SALES_REQUEST_GENERATION_ISSUE_CATEGORIES,
	SALES_REQUEST_GENERATION_STATUSES,
	aggregateSalesRequestGenerationRuns,
	countSalesRequestGenerationIssues,
	createSalesRequestSeedDigest,
	getSalesRequestGenerationPilotAuthorityBlockers,
} from "./sales-request-telemetry";

describe("sales request telemetry boundaries", () => {
	test("counts only bounded unresolved issue statuses", () => {
		expect(
			countSalesRequestGenerationIssues({
				unresolved: [
					{ status: "ambiguous", reason: "private source text" },
					{ status: "unreadable", reason: "private source text" },
					{ status: "unsupported", reason: "private source text" },
					{ status: "ignored", reason: "not a tracked category" },
				],
			}),
		).toEqual({ ambiguous: 1, unreadable: 1, unsupported: 1 });
	});

	test("digests only the canonical validated seed shape", () => {
		const seed = {
			schemaVersion: 1 as const,
			lineItems: [],
			unresolved: [
				{
					lineUid: null,
					stepId: null,
					field: "request",
					status: "unsupported" as const,
					reason: "No configured item route matches the request",
				},
			],
		};
		const reordered = {
			unresolved: seed.unresolved.map((entry) => ({
				reason: entry.reason,
				status: entry.status,
				field: entry.field,
				stepId: entry.stepId,
				lineUid: entry.lineUid,
			})),
			lineItems: seed.lineItems,
			schemaVersion: seed.schemaVersion,
		};
		const firstUnresolved = seed.unresolved[0];
		if (!firstUnresolved) throw new Error("Expected an unresolved fixture.");

		const identity = {
			generationId: "11111111-1111-4111-8111-111111111111",
			configurationScope: "sales-settings:7",
			configurationRevision: "revision-one",
		};
		const digest = (candidate: typeof seed) =>
			createSalesRequestSeedDigest({ seed: candidate, ...identity });

		expect(digest(seed)).toMatch(/^h1:[a-f0-9]{64}$/);
		expect(digest(reordered)).toBe(digest(seed));
		expect(
			createSalesRequestSeedDigest({
				seed,
				...identity,
				generationId: "22222222-2222-4222-8222-222222222222",
			}),
		).not.toBe(digest(seed));
		expect(
			digest({
				...seed,
				unresolved: [{ ...firstUnresolved, reason: "Different fact" }],
			}),
		).not.toBe(digest(seed));
	});

	test("rejects non-JSON values before creating a seed binding", () => {
		const seed = {
			schemaVersion: 1 as const,
			lineItems: [],
			unresolved: [],
		};
		expect(() =>
			createSalesRequestSeedDigest({
				seed: {
					...seed,
					schemaVersion: Number.NaN as 1,
				},
				generationId: "11111111-1111-4111-8111-111111111111",
				configurationScope: "sales-settings:7",
				configurationRevision: "revision-one",
			}),
		).toThrow("non-finite number");
	});

	test("aggregates metadata without exposing actor or source fields", () => {
		const report = aggregateSalesRequestGenerationRuns([
			{
				generationId: "server-id-1",
				actorUserId: 17,
				scope: "sales-settings:7",
				configurationRevision: "a".repeat(64),
				provider: "openai",
				model: "gpt-5-mini",
				status: "succeeded",
				latencyMs: 950,
				inputTokens: 100,
				outputTokens: 20,
				issueCounts: { ambiguous: 1, unreadable: 0, unsupported: 0 },
				applyOutcome: "applied",
				saveDraftOutcome: null,
				saveFinalOutcome: null,
				feedbackOutcome: "accepted-with-edits",
				feedbackIssueCategories: ["ambiguous"],
				feedbackChangedFieldCategories: ["line-items"],
				correctionMs: 1_200,
				createdAt: new Date("2026-09-12T10:00:00.000Z"),
			},
		]);

		expect(report).toMatchObject({
			generationCount: 1,
			succeededCount: 1,
			statusCounts: { succeeded: 1 },
			tokenTotals: { input: 100, output: 20 },
			outcomeCounts: {
				applied: 1,
				feedbackAcceptedWithEdits: 1,
			},
			issueCounts: { ambiguous: 1 },
			changedFieldCounts: { "line-items": 1 },
			latency: { sampleCount: 1, p50Ms: 950, p95Ms: 950 },
			correction: { sampleCount: 1, p50Ms: 1_200, p95Ms: 1_200 },
		});
		expect(JSON.stringify(report)).not.toMatch(
			/server-id|actorUserId|source text/,
		);
	});

	test("reports blocked and failed pilot outcomes without run-level details", () => {
		const report = aggregateSalesRequestGenerationRuns([
			{ status: "cancelled", latencyMs: null, applyOutcome: "blocked" },
			{
				status: "succeeded",
				latencyMs: 301_000,
				applyOutcome: "stale",
				saveDraftOutcome: "failed",
				saveFinalOutcome: "failed",
			},
			{ status: "invalid-output", latencyMs: -1, applyOutcome: "unavailable" },
		]);

		expect(report.statusCounts).toEqual({
			cancelled: 1,
			succeeded: 1,
			"invalid-output": 1,
		});
		expect(report.outcomeCounts).toMatchObject({
			applyBlocked: 1,
			applyStale: 1,
			applyUnavailable: 1,
			saveDraftFailed: 1,
			saveFinalFailed: 1,
		});
		expect(report.latency).toEqual({
			sampleCount: 1,
			p50Ms: 300_000,
			p95Ms: 300_000,
		});
	});

	test("fails closed when immutable pilot authority is legacy or mixed", () => {
		const authority = {
			scope: "sales-settings:7",
			configurationRevision: "a".repeat(64),
			provider: "openai",
			model: "gpt-5-mini",
			promptVersion: "new-sales-form-seed-v6",
			schemaVersion: 2,
			pilotSettingsRevision: 3,
			providerBenchmarkApprovalRevision: 4,
		};
		expect(
			getSalesRequestGenerationPilotAuthorityBlockers(
				{
					...authority,
					pilotSettingsRevision: 0,
					providerBenchmarkApprovalRevision: 5,
					status: "started",
				},
				authority,
			),
		).toEqual(
			expect.arrayContaining([
				"legacy-run-authority",
				"provider-benchmark-revision-mismatch",
				"incomplete-run",
			]),
		);
	});

	test("keeps telemetry vocabularies bounded and explicit", () => {
		expect(SALES_REQUEST_GENERATION_STATUSES).toContain("provider-error");
		expect(SALES_REQUEST_GENERATION_ISSUE_CATEGORIES).toContain("ambiguous");
		expect(SALES_REQUEST_GENERATION_ISSUE_CATEGORIES).toContain(
			"unsafe-selection",
		);
		expect(
			SALES_REQUEST_GENERATION_ISSUE_CATEGORIES.length,
		).toBeLessThanOrEqual(12);
	});
});
