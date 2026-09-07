import { describe, expect, it } from "bun:test";

import { resolveSalesPipelineSnapshot } from "./sales-pipeline";
import {
	classifyFulfillmentProofSourceRepair,
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
	it("repairs only an explicit but partially normalized Dispatch completion proof", () => {
		expect(
			classifyFulfillmentProofSourceRepair({
				dispatchStatus: "completed",
				deliveredAt: new Date("2026-09-02T12:00:00.000Z"),
				inventoryCommitted: true,
				dispatchCompletion: {
					requestId: "dispatch-request-1",
					completedAt: "2026-09-02T12:00:00.000Z",
				},
			}),
		).toEqual({
			category: "deterministic_repair",
			repairable: true,
			reasons: ["DISPATCH_COMPLETION_STATUS_MISSING"],
			patch: { status: "completed" },
		});
	});

	it("does not manufacture proof from legacy terminal fields", () => {
		expect(
			classifyFulfillmentProofSourceRepair({
				dispatchStatus: "completed",
				deliveredAt: new Date("2026-09-02T12:00:00.000Z"),
				inventoryCommitted: true,
				dispatchCompletion: {},
			}),
		).toEqual({
			category: "review_required",
			repairable: false,
			reasons: ["DELIVERY_PROOF_NOT_RECONSTRUCTABLE"],
			patch: null,
		});
		expect(
			classifyFulfillmentProofSourceRepair({
				dispatchStatus: "completed",
				deliveredAt: new Date("2026-09-02T12:00:00.000Z"),
				inventoryCommitted: true,
				dispatchCompletion: {
					status: 0,
					requestId: "dispatch-request-1",
					completedAt: "2026-09-02T12:00:00.000Z",
				},
			}),
		).toMatchObject({
			category: "unsafe",
			repairable: false,
			reasons: ["DISPATCH_COMPLETION_STATUS_CONFLICT"],
		});
	});

	it("fails closed when partial proof conflicts with Dispatch or inventory state", () => {
		const completion = {
			requestId: "dispatch-request-1",
			completedAt: "2026-09-02T12:00:00.000Z",
		};
		expect(
			classifyFulfillmentProofSourceRepair({
				dispatchStatus: "pending",
				deliveredAt: null,
				inventoryCommitted: true,
				dispatchCompletion: completion,
			}),
		).toEqual({
			category: "unsafe",
			repairable: false,
			reasons: ["DISPATCH_NOT_TERMINAL", "DELIVERED_AT_MISSING"],
			patch: null,
		});
		expect(
			classifyFulfillmentProofSourceRepair({
				dispatchStatus: "completed",
				deliveredAt: new Date("2026-09-02T12:00:00.000Z"),
				inventoryCommitted: false,
				dispatchCompletion: completion,
			}),
		).toEqual({
			category: "unsafe",
			repairable: false,
			reasons: ["INVENTORY_COMMIT_MISSING"],
			patch: null,
		});
	});

	it("recognizes already canonical proof and rejects malformed proof timestamps", () => {
		expect(
			classifyFulfillmentProofSourceRepair({
				dispatchStatus: "completed",
				deliveredAt: new Date("2026-09-02T12:00:00.000Z"),
				inventoryCommitted: true,
				dispatchCompletion: {
					status: "completed",
					requestId: "dispatch-request-1",
					completedAt: "2026-09-02T12:00:00.000Z",
				},
			}),
		).toEqual({
			category: "clean",
			repairable: false,
			reasons: [],
			patch: null,
		});
		expect(
			classifyFulfillmentProofSourceRepair({
				dispatchStatus: "completed",
				deliveredAt: new Date("2026-09-02T12:00:00.000Z"),
				inventoryCommitted: true,
				dispatchCompletion: {
					requestId: "dispatch-request-1",
					completedAt: "not-a-date",
				},
			}),
		).toEqual({
			category: "review_required",
			repairable: false,
			reasons: ["DELIVERY_PROOF_NOT_RECONSTRUCTABLE"],
			patch: null,
		});
		expect(
			classifyFulfillmentProofSourceRepair({
				dispatchStatus: "completed",
				deliveredAt: new Date("2026-09-02T12:00:00.000Z"),
				inventoryCommitted: true,
				dispatchCompletion: {
					status: "failed",
					requestId: "dispatch-request-1",
					completedAt: "2026-09-02T12:00:00.000Z",
				},
			}),
		).toEqual({
			category: "unsafe",
			repairable: false,
			reasons: ["DISPATCH_COMPLETION_STATUS_CONFLICT"],
			patch: null,
		});
	});

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

	it("repairs stale presentation before returning a blocking lifecycle conflict for review", () => {
		const canonical = resolveSalesPipelineSnapshot({
			salesOrderId: 2,
			orderNo: "SO-CONFLICT",
			commercial: { status: "fulfilled" },
			payment: { total: 100, amountDue: 0 },
			material: { applicability: "not_required" },
			production: {
				configuredRequirement: false,
				requiredQty: 0,
				assignments: [{ id: 2, active: true, assignedQty: 1, completedQty: 0 }],
				submissions: [],
			},
			fulfillment: {
				configuredRequirement: false,
				requiredQty: 0,
				packedQty: 0,
				dispatches: [],
			},
			evidenceUpdatedAt: "2026-09-02",
		});

		expect(
			classifySalesPipelineReconciliation({
				snapshot: canonical,
				projection: {
					...projection(canonical.revision),
					pipelineRevision: "stale",
				},
			}),
		).toEqual({
			category: "deterministic_repair",
			repairable: true,
			reasons: ["PIPELINE_REVISION_MISMATCH"],
		});
		expect(
			classifySalesPipelineReconciliation({
				snapshot: canonical,
				projection: projection(canonical.revision),
			}),
		).toEqual({
			category: "review_required",
			repairable: false,
			reasons: ["PRODUCTION_NOT_REQUIRED_WITH_OPERATIONAL_EVIDENCE"],
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
