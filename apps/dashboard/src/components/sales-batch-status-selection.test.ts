import { describe, expect, it } from "bun:test";

import {
	resolveSalesBatchAdministrativeOverrideSelection,
	resolveSalesBatchStatusSelection,
} from "./sales-batch-status-selection";

describe("sales batch status selection", () => {
	it("skips orders that already completed production", () => {
		expect(
			resolveSalesBatchStatusSelection({
				action: "production_completed",
				salesIds: [11, 12, 13, 14],
				candidates: [
					{ salesId: 11, status: "in_production" },
					{ salesId: 12, status: "ready_to_fulfill" },
					{ salesId: 13, status: "fulfilled" },
					{ salesId: 14, productionCompleted: true },
				],
			}),
		).toEqual({
			eligibleSalesIds: [11],
			skippedSalesIds: [12, 13, 14],
		});
	});

	it("keeps production-completed orders eligible for fulfillment", () => {
		expect(
			resolveSalesBatchStatusSelection({
				action: "fulfilled",
				salesIds: [21, 22, 23],
				candidates: [
					{ salesId: 21, status: "ready_to_fulfill" },
					{ salesId: 22, status: "packing" },
					{ salesId: 23, status: "fulfilled" },
				],
			}),
		).toEqual({
			eligibleSalesIds: [21, 22],
			skippedSalesIds: [23],
		});
	});

	it("keeps unknown candidates eligible for backward-compatible callers", () => {
		expect(
			resolveSalesBatchStatusSelection({
				action: "production_completed",
				salesIds: [31, 32],
				candidates: [{ salesId: 31, status: "ready_to_fulfill" }],
			}),
		).toEqual({
			eligibleSalesIds: [32],
			skippedSalesIds: [31],
		});
	});

	it("fails ordinary batch actions closed for explicit lifecycle exceptions", () => {
		expect(
			resolveSalesBatchStatusSelection({
				action: "fulfilled",
				salesIds: [41, 42, 43],
				candidates: [
					{ salesId: 41, status: "unknown" },
					{ salesId: 42, status: "conflict" },
				],
			}),
		).toEqual({
			eligibleSalesIds: [43],
			skippedSalesIds: [41, 42],
		});
	});
});

describe("sales batch administrative override selection", () => {
	it("keeps only canonical lifecycle exceptions with their expected revisions", () => {
		expect(
			resolveSalesBatchAdministrativeOverrideSelection({
				salesIds: [11, 12, 13, 14, 11],
				candidates: [
					{ salesId: 11, status: "unknown", pipelineRevision: "a".repeat(64) },
					{ salesId: 12, status: "conflict", pipelineRevision: "b".repeat(64) },
					{
						salesId: 13,
						status: "in_production",
						pipelineRevision: "c".repeat(64),
					},
					{ salesId: 14, status: "unknown", pipelineRevision: null },
				],
			}),
		).toEqual({
			eligible: [
				{ salesId: 11, pipelineRevision: "a".repeat(64) },
				{ salesId: 12, pipelineRevision: "b".repeat(64) },
			],
			skippedSalesIds: [13, 14],
		});
	});
});
