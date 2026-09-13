import { describe, expect, test } from "bun:test";
import {
	SALES_REQUEST_MATCHED_COMPARISON_MIN_CELL_SIZE,
	buildSalesRequestMatchedComparison,
} from "./sales-request-matched-comparison";
import { SALES_REQUEST_COMPLEXITY_VERSION } from "./sales-request-request-shape";

function row(input: {
	id: string;
	lowTouch: boolean;
	stratum?: "simple" | "standard" | "complex";
	minutes?: number;
	edited?: boolean;
}) {
	return {
		generationId: input.id,
		actorUserId: 17,
		consumedSalesId: input.lowTouch ? 91 : null,
		status: "succeeded",
		applyOutcome: "applied",
		saveFinalOutcome: "saved",
		startedAt: new Date("2026-09-13T00:00:00.000Z"),
		saveFinalAt: new Date(
			Date.parse("2026-09-13T00:00:00.000Z") + (input.minutes ?? 5) * 60_000,
		),
		feedbackOutcome: input.edited ? "accepted-with-edits" : "accepted",
		feedbackIssueCategories: [],
		feedbackChangedFieldCategories: input.edited ? ["line-items"] : [],
		requestComplexityVersion: SALES_REQUEST_COMPLEXITY_VERSION,
		requestComplexityStratum: input.stratum ?? "simple",
	};
}

describe("Sales Request matched operational comparison", () => {
	test("matches equal counts inside common strata without exposing identities", () => {
		const rows = [
			...Array.from({ length: 7 }, (_, index) =>
				row({
					id: `assistive-${index}`,
					lowTouch: false,
					minutes: 10 + index,
					edited: index % 2 === 0,
				}),
			),
			...Array.from({ length: 5 }, (_, index) =>
				row({
					id: `low-touch-${index}`,
					lowTouch: true,
					minutes: 4 + index,
				}),
			),
		];
		const result = buildSalesRequestMatchedComparison(rows);

		expect(result).toMatchObject({
			status: "descriptive-only",
			autonomyDecisionEligible: false,
			blockers: [],
			byStratum: [
				{
					stratum: "simple",
					available: { assistive: 7, lowTouch: 5 },
					assistive: { matchedCount: 5 },
					lowTouch: { matchedCount: 5 },
				},
			],
			overall: {
				assistive: { matchedCount: 5 },
				lowTouch: { matchedCount: 5 },
			},
		});
		expect(JSON.stringify(result)).not.toMatch(
			/assistive-|low-touch-|generationId|actorUserId|consumedSalesId|startedAt|saveFinalAt/,
		);
	});

	test("is deterministic across input order", () => {
		const rows = [
			...Array.from({ length: 7 }, (_, index) =>
				row({ id: `a-${index}`, lowTouch: false, minutes: index + 1 }),
			),
			...Array.from({ length: 6 }, (_, index) =>
				row({ id: `b-${index}`, lowTouch: true, minutes: index + 2 }),
			),
		];
		expect(buildSalesRequestMatchedComparison([...rows].reverse())).toEqual(
			buildSalesRequestMatchedComparison(rows),
		);
	});

	test("fails closed for incomplete rows instead of silently dropping them", () => {
		const rows = [
			...Array.from({ length: 5 }, (_, index) =>
				row({ id: `a-${index}`, lowTouch: false }),
			),
			...Array.from({ length: 5 }, (_, index) =>
				row({ id: `b-${index}`, lowTouch: true }),
			),
			{
				...row({ id: "legacy", lowTouch: false }),
				requestComplexityVersion: null,
			},
		];
		const result = buildSalesRequestMatchedComparison(rows);

		expect(result).toMatchObject({
			status: "insufficient-evidence",
			blockers: ["request-shape-incomplete"],
			byStratum: [],
			overall: { observedLowTouchMinusAssistive: null },
		});
	});

	test("requires a privacy-preserving minimum common cell size", () => {
		const count = SALES_REQUEST_MATCHED_COMPARISON_MIN_CELL_SIZE - 1;
		const result = buildSalesRequestMatchedComparison([
			...Array.from({ length: count }, (_, index) =>
				row({ id: `a-${index}`, lowTouch: false }),
			),
			...Array.from({ length: count }, (_, index) =>
				row({ id: `b-${index}`, lowTouch: true }),
			),
		]);

		expect(result).toMatchObject({
			status: "insufficient-evidence",
			blockers: ["request-shape-sample-too-small"],
			byStratum: [],
		});
	});

	test("requires a request shape represented in both arms", () => {
		const result = buildSalesRequestMatchedComparison([
			...Array.from({ length: 5 }, (_, index) =>
				row({ id: `a-${index}`, lowTouch: false, stratum: "simple" }),
			),
			...Array.from({ length: 5 }, (_, index) =>
				row({ id: `b-${index}`, lowTouch: true, stratum: "complex" }),
			),
		]);

		expect(result).toMatchObject({
			status: "insufficient-evidence",
			blockers: ["request-shape-arm-missing", "no-common-request-shape"],
		});
	});

	test("fails closed when another observed shape is absent from one arm", () => {
		const result = buildSalesRequestMatchedComparison([
			...Array.from({ length: 5 }, (_, index) =>
				row({ id: `a-${index}`, lowTouch: false, stratum: "simple" }),
			),
			...Array.from({ length: 5 }, (_, index) =>
				row({ id: `b-${index}`, lowTouch: true, stratum: "simple" }),
			),
			row({ id: "standard-only", lowTouch: false, stratum: "standard" }),
		]);

		expect(result).toMatchObject({
			status: "insufficient-evidence",
			blockers: ["request-shape-arm-missing"],
			byStratum: [],
			overall: { observedLowTouchMinusAssistive: null },
		});
	});
});
