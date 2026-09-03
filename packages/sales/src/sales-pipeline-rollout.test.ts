import { describe, expect, it, spyOn } from "bun:test";
import { resolveSalesPipelineSnapshot } from "./sales-pipeline";
import {
	evaluateSalesPipelineCutoverGates,
	getSalesPipelineCommandMode,
	getSalesPipelineReadMode,
	observeSalesPipelineReadProjection,
	shouldEnforceCanonicalSalesPipelineCommands,
	shouldServeCanonicalSalesPipeline,
} from "./sales-pipeline-rollout";

describe("Sales Pipeline rollout", () => {
	it("defaults production to shadow and keeps rollback explicit", () => {
		expect(getSalesPipelineReadMode({ NODE_ENV: "production" })).toBe("shadow");
		expect(getSalesPipelineCommandMode({ NODE_ENV: "production" })).toBe(
			"shadow",
		);
		expect(
			shouldServeCanonicalSalesPipeline(42, {
				NODE_ENV: "production",
				SALES_PIPELINE_READ_MODE: "legacy",
			}),
		).toBe(false);
	});

	it("does not enforce canonical commands before the command cutover gate", () => {
		expect(
			shouldEnforceCanonicalSalesPipelineCommands(1, {
				NODE_ENV: "production",
				SALES_PIPELINE_COMMAND_MODE: "shadow",
			}),
		).toBe(false);
		expect(
			shouldEnforceCanonicalSalesPipelineCommands(1, {
				NODE_ENV: "production",
				SALES_PIPELINE_COMMAND_MODE: "canonical",
				SALES_PIPELINE_COHORT_PERCENT: "100",
			}),
		).toBe(true);
	});

	it("supports deterministic bounded cohorts", () => {
		const env = {
			SALES_PIPELINE_READ_MODE: "canonical",
			SALES_PIPELINE_COHORT_PERCENT: "10",
		};
		expect(shouldServeCanonicalSalesPipeline(42, env)).toBe(
			shouldServeCanonicalSalesPipeline(42, env),
		);
	});

	it("fails closed until every operational gate passes", () => {
		expect(
			evaluateSalesPipelineCutoverGates({
				unexplainedMembershipDifferences: 0,
				unsafeTransitionDifferences: 0,
				staleProjectionDifferences: 0,
				p95LatencyMs: 50,
				maxP95LatencyMs: 100,
				conflictSampleComplete: true,
				operatorApproved: false,
			}),
		).toEqual({ passed: false, failures: ["OPERATOR_APPROVAL_REQUIRED"] });
	});

	it("fails closed when any materialized projection is stale", () => {
		expect(
			evaluateSalesPipelineCutoverGates({
				unexplainedMembershipDifferences: 0,
				unsafeTransitionDifferences: 0,
				staleProjectionDifferences: 1,
				p95LatencyMs: 50,
				maxP95LatencyMs: 100,
				conflictSampleComplete: true,
				operatorApproved: true,
			}),
		).toEqual({ passed: false, failures: ["STALE_PROJECTION_DIFFERENCES"] });
	});

	it("emits sampled shadow differences without changing visible state", () => {
		const snapshot = resolveSalesPipelineSnapshot({
			salesOrderId: 1,
			orderNo: "SO-1",
			commercial: { status: "open" },
			payment: { total: 100, amountDue: 0 },
			material: {
				applicability: "not_required",
				requiredQty: 0,
				readyQty: 0,
			},
			production: {
				configuredRequirement: false,
				requiredQty: 0,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
			fulfillment: {
				configuredRequirement: false,
				requiredQty: 0,
				packedQty: 0,
				dispatches: [],
				administrativeCompletion: null,
			},
		});
		const info = spyOn(console, "info").mockImplementation(() => {});
		try {
			expect(
				observeSalesPipelineReadProjection(
					snapshot,
					{ surface: "test", legacyHeadline: "legacy" },
					{
						SALES_PIPELINE_READ_MODE: "shadow",
						SALES_PIPELINE_SHADOW_SAMPLE_PERCENT: "100",
					},
				),
			).toBeNull();
			expect(info).toHaveBeenCalledWith(
				"[sales-pipeline-shadow]",
				expect.objectContaining({
					surface: "test",
					differenceCodes: ["HEADLINE_MISMATCH"],
				}),
			);
		} finally {
			info.mockRestore();
		}
	});
});
