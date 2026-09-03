import { describe, expect, it } from "bun:test";
import {
	type SalesPipelineEvidence,
	resolveSalesPipelineSnapshot,
} from "./sales-pipeline";
import { evaluateSalesPipelineCommand } from "./sales-pipeline-commands";

function snapshot(overrides: Partial<SalesPipelineEvidence> = {}) {
	return resolveSalesPipelineSnapshot({
		salesOrderId: 1,
		orderNo: "09502PC",
		commercial: { status: "open" },
		payment: { total: 100, amountDue: 0 },
		material: { applicability: "required", requiredQty: 1, readyQty: 1 },
		production: {
			configuredRequirement: true,
			requiredQty: 1,
			assignments: [],
			submissions: [],
			aggregate: null,
			administrativeCompletion: null,
		},
		fulfillment: {
			configuredRequirement: true,
			requiredQty: 1,
			packedQty: 0,
			dispatches: [],
			administrativeCompletion: null,
		},
		...overrides,
	});
}

describe("evaluateSalesPipelineCommand", () => {
	it("rejects stale, unauthorized, and conflicting transitions before writes", () => {
		const current = snapshot();
		expect(
			evaluateSalesPipelineCommand(current, {
				action: "production.complete",
				authorized: true,
				expectedRevision: "stale",
			}).reasons,
		).toEqual(["STALE_REVISION"]);
		expect(
			evaluateSalesPipelineCommand(current, {
				action: "production.complete",
				authorized: false,
			}).reasons,
		).toEqual(["PERMISSION_DENIED"]);
	});

	it("returns a replay for terminal evidence and central affected scopes", () => {
		const current = snapshot({
			production: {
				configuredRequirement: true,
				requiredQty: 1,
				assignments: [
					{
						id: 1,
						active: true,
						assignedQty: 1,
						completedQty: 1,
						completedAt: "2026-09-02",
					},
				],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
		});
		const decision = evaluateSalesPipelineCommand(current, {
			action: "production.complete",
			authorized: true,
			expectedRevision: current.revision,
		});
		expect(decision.status).toBe("replay");
		expect(decision.affectedScopes).toContain("production.calendar");
	});

	it("governs administrative completion and cancellation without fabricating workflow proof", () => {
		const unresolved = snapshot({
			production: {
				configuredRequirement: null,
				requiredQty: 0,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: null,
			},
		});
		expect(
			evaluateSalesPipelineCommand(unresolved, {
				action: "production.administrative_complete",
				authorized: true,
			}).status,
		).toBe("ready");

		const administrativelyCompleted = snapshot({
			production: {
				configuredRequirement: null,
				requiredQty: 0,
				assignments: [],
				submissions: [],
				aggregate: null,
				administrativeCompletion: {
					method: "STATUS_ONLY",
					recordId: "completion-1",
					recordedAt: "2026-09-02",
				},
			},
		});
		expect(administrativelyCompleted.production.state).toBe(
			"administratively_completed",
		);
		expect(
			evaluateSalesPipelineCommand(administrativelyCompleted, {
				action: "production.administrative_cancel",
				authorized: true,
			}).status,
		).toBe("ready");
	});

	it("governs assignment creation and rejects impossible operational transitions", () => {
		const current = snapshot();
		expect(
			evaluateSalesPipelineCommand(current, {
				action: "production.assign",
				authorized: true,
				expectedRevision: current.revision,
			}).status,
		).toBe("ready");
		expect(
			evaluateSalesPipelineCommand(current, {
				action: "fulfillment.start_dispatch",
				authorized: true,
			}).reasons,
		).toEqual(["DISPATCH_REQUIRED"]);
		expect(
			evaluateSalesPipelineCommand(current, {
				action: "fulfillment.complete_dispatch",
				authorized: true,
			}).reasons,
		).toEqual(["DISPATCH_NOT_IN_PROGRESS"]);
		expect(
			evaluateSalesPipelineCommand(current, {
				action: "production.submit",
				authorized: true,
			}).reasons,
		).toEqual(["PRODUCTION_ASSIGNMENT_REQUIRED"]);
	});

	it("permits departure only for an item-bearing packed dispatch", () => {
		const current = snapshot({
			fulfillment: {
				configuredRequirement: true,
				requiredQty: 1,
				packedQty: 1,
				dispatches: [
					{
						id: 9,
						active: true,
						itemCount: 1,
						deliveredQty: 0,
						status: "packed",
						proofCompleted: false,
						inventoryCommitted: false,
					},
				],
				administrativeCompletion: null,
			},
		});
		expect(
			evaluateSalesPipelineCommand(current, {
				action: "fulfillment.start_dispatch",
				authorized: true,
				expectedRevision: current.revision,
			}).status,
		).toBe("ready");
	});

	it("keeps the audited review-resolution path available for review-owned conflicts", () => {
		const current = snapshot({
			production: {
				configuredRequirement: false,
				requiredQty: 1,
				assignments: [
					{
						id: 1,
						active: true,
						assignedQty: 1,
						completedQty: 0,
						completedAt: null,
					},
				],
				submissions: [
					{ id: 2, active: true, quantity: 1, reviewStatus: "PENDING" },
				],
				aggregate: null,
				administrativeCompletion: null,
			},
		});
		expect(current.production.state).toBe("conflict");
		expect(current.conflicts.length).toBeGreaterThan(0);
		expect(
			evaluateSalesPipelineCommand(current, {
				action: "production.review.resolve",
				authorized: true,
				expectedRevision: current.revision,
			}).status,
		).toBe("ready");
		const withoutPendingReview = snapshot();
		expect(
			evaluateSalesPipelineCommand(withoutPendingReview, {
				action: "production.review.resolve",
				authorized: true,
				expectedRevision: withoutPendingReview.revision,
			}),
		).toMatchObject({
			status: "replay",
			reasons: ["NO_PENDING_PRODUCTION_REVIEW"],
		});
	});
});
