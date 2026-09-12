import { describe, expect, test } from "bun:test";
import {
	SALES_REQUEST_GENERATION_ISSUE_CATEGORIES,
	SALES_REQUEST_GENERATION_STATUSES,
	aggregateSalesRequestGenerationRuns,
	countSalesRequestGenerationIssues,
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
			correction: { sampleCount: 1, p50Ms: 1_200, p95Ms: 1_200 },
		});
		expect(JSON.stringify(report)).not.toMatch(
			/server-id|actorUserId|source text/,
		);
	});

	test("keeps telemetry vocabularies bounded and explicit", () => {
		expect(SALES_REQUEST_GENERATION_STATUSES).toContain("provider-error");
		expect(SALES_REQUEST_GENERATION_ISSUE_CATEGORIES).toContain("ambiguous");
		expect(
			SALES_REQUEST_GENERATION_ISSUE_CATEGORIES.length,
		).toBeLessThanOrEqual(12);
	});
});
