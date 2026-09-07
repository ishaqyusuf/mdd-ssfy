import { describe, expect, it } from "bun:test";
import { evaluateSalesPipelineCutoverGates } from "./sales-pipeline-rollout";

describe("Sales Pipeline rollout", () => {
	it("fails closed until every operational gate passes", () => {
		expect(
			evaluateSalesPipelineCutoverGates({
				comparedOrders: 100,
				unexplainedMembershipDifferences: 0,
				unsafeTransitionDifferences: 0,
				staleProjectionDifferences: 0,
				p95LatencyMs: 50,
				maxP95LatencyMs: 100,
				conflictSampleComplete: true,
				operatorApproved: false,
			}),
		).toMatchObject({
			passed: false,
			failures: ["OPERATOR_APPROVAL_REQUIRED"],
		});
	});

	it("fails closed when any materialized projection is stale", () => {
		expect(
			evaluateSalesPipelineCutoverGates({
				comparedOrders: 100,
				unexplainedMembershipDifferences: 0,
				unsafeTransitionDifferences: 0,
				staleProjectionDifferences: 1,
				p95LatencyMs: 50,
				maxP95LatencyMs: 100,
				conflictSampleComplete: true,
				operatorApproved: true,
			}),
		).toMatchObject({
			passed: false,
			failures: ["STALE_PROJECTION_DIFFERENCES"],
		});
	});

	it("reports unresolved reconciliation exceptions without blocking cutover", () => {
		expect(
			evaluateSalesPipelineCutoverGates({
				comparedOrders: 8_172,
				unexplainedMembershipDifferences: 0,
				unsafeTransitionDifferences: 672,
				staleProjectionDifferences: 0,
				p95LatencyMs: 50,
				maxP95LatencyMs: 100,
				conflictSampleComplete: false,
				operatorApproved: true,
			}),
		).toEqual({
			passed: true,
			failures: [],
			reconciliation: {
				comparedOrders: 8_172,
				acceptedOrders: 7_500,
				informationalExceptionOrders: 672,
				conflictSampleComplete: false,
				requiresAutomaticRepair: false,
			},
		});
	});

	it("rejects an internally inconsistent reconciliation report", () => {
		expect(
			evaluateSalesPipelineCutoverGates({
				comparedOrders: 10,
				unexplainedMembershipDifferences: 0,
				unsafeTransitionDifferences: 11,
				staleProjectionDifferences: 0,
				p95LatencyMs: 50,
				maxP95LatencyMs: 100,
				conflictSampleComplete: true,
				operatorApproved: true,
			}),
		).toMatchObject({
			passed: false,
			failures: ["INVALID_RECONCILIATION_COUNTS"],
		});
	});
});
