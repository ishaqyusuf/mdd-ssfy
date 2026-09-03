import { describe, expect, it } from "bun:test";

import { resolveSalesPipelineSnapshot } from "./sales-pipeline";
import {
	classifySalesPipelineReconciliation,
	summarizeSalesPipelineReconciliation,
} from "./sales-pipeline-reconciliation";

function snapshot() {
	return resolveSalesPipelineSnapshot({
		salesOrderId: 1,
		orderNo: "SO-1",
		commercial: { status: "open" },
		payment: { total: 100, amountDue: 0 },
		material: { applicability: "not_required" },
		production: {
			configuredRequirement: false,
			requiredQty: 0,
			assignments: [],
			submissions: [],
		},
		fulfillment: {
			configuredRequirement: true,
			requiredQty: 1,
			packedQty: 0,
			dispatches: [],
		},
		evidenceUpdatedAt: "2026-09-02",
	});
}

function projection(revision: string) {
	return {
		exists: true,
		state: "ready",
		version: 1,
		expectedVersion: 1,
		sourceUpdatedAt: new Date("2026-09-02"),
		orderUpdatedAt: new Date("2026-09-02"),
		pipelineRevision: revision,
		pipelineVersion: "sales-pipeline/v2",
	};
}

describe("Sales Pipeline reconciliation", () => {
	it("classifies only derived projection drift as repairable", () => {
		const canonical = snapshot();
		const result = classifySalesPipelineReconciliation({
			snapshot: canonical,
			projection: {
				...projection(canonical.revision),
				pipelineRevision: "stale",
			},
		});

		expect(result).toEqual({
			category: "deterministic_repair",
			repairable: true,
			reasons: ["PIPELINE_REVISION_MISMATCH"],
		});
	});

	it("is stable once the versioned projection matches the evidence revision", () => {
		const canonical = snapshot();
		const input = {
			snapshot: canonical,
			projection: projection(canonical.revision),
		};

		expect(classifySalesPipelineReconciliation(input)).toEqual(
			classifySalesPipelineReconciliation(input),
		);
		expect(classifySalesPipelineReconciliation(input).category).toBe("clean");
	});

	it("summarizes review and unsafe populations separately", () => {
		expect(
			summarizeSalesPipelineReconciliation([
				{ category: "clean" },
				{ category: "review_required" },
				{ category: "unsafe" },
			]),
		).toMatchObject({ clean: 1, review_required: 1, unsafe: 1 });
	});
});
