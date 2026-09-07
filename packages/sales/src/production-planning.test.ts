import { describe, expect, it } from "bun:test";
import { resolveProductionPlanningGap } from "./production-planning";
import { evaluateSalesPipelineCommand } from "./sales-pipeline-commands";
import {
	type SalesPipelineEvidence,
	resolveSalesPipelineSnapshot,
} from "./sales-pipeline";

function evidence(): SalesPipelineEvidence {
	return {
		salesOrderId: 42,
		orderNo: "09502PC",
		evidenceUpdatedAt: "2026-09-07T12:00:00.000Z",
		commercial: { status: "open" },
		payment: { total: 100, amountDue: 0 },
		material: { applicability: "required", requiredQty: 5, readyQty: 5 },
		production: {
			configuredRequirement: true,
			requiredQty: 5,
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
	};
}

function gap(source: SalesPipelineEvidence, authorizedToAssign = true) {
	return resolveProductionPlanningGap(resolveSalesPipelineSnapshot(source), {
		authorizedToAssign,
	});
}

describe("canonical Production planning membership", () => {
	it("exposes unassigned demand without inventing schedule identities", () => {
		expect(gap(evidence())).toMatchObject({
			kind: "planning",
			reason: "not_assigned",
			requiredQty: 5,
			assignedQty: 0,
			uncoveredQty: 5,
			assignmentCount: 0,
			canAssign: true,
		});
		expect(gap(evidence())).not.toHaveProperty("assignmentIds");
	});

	it("tracks partial coverage then removes fully covered demand", () => {
		const source = evidence();
		source.production.assignments.push({
			id: 1,
			active: true,
			assignedQty: 2,
			completedQty: 0,
		});
		expect(gap(source)).toMatchObject({
			reason: "partially_assigned",
			assignedQty: 2,
			uncoveredQty: 3,
		});
		source.production.assignments.push({
			id: 2,
			active: false,
			assignedQty: 3,
			completedQty: 0,
		});
		expect(gap(source)?.uncoveredQty).toBe(3);
		source.production.assignments[1]!.active = true;
		expect(gap(source)).toBeNull();
	});

	it("keeps read-only users read-only without labelling valid demand as a conflict", () => {
		expect(gap(evidence(), false)).toMatchObject({
			reason: "not_assigned",
			canAssign: false,
			assignmentLockReasons: ["PERMISSION_DENIED"],
		});
	});

	for (const terminal of [
		"deleted",
		"archived",
		"cancelled",
		"void",
		"voided",
		"not_required",
	] as const) {
		it(`excludes ${terminal} work`, () => {
			const source = evidence();
			if (terminal === "deleted") source.commercial.deletedAt = "2026-09-07";
			if (terminal === "archived") source.commercial.archivedAt = "2026-09-07";
			if (terminal === "cancelled") source.commercial.status = "cancelled";
			if (terminal === "void" || terminal === "voided") {
				source.commercial.status = terminal;
				const snapshot = resolveSalesPipelineSnapshot(source);
				expect(snapshot.headline.code).toBe("cancelled");
				expect(
					evaluateSalesPipelineCommand(snapshot, {
						action: "production.assign",
						authorized: true,
					}).status,
				).toBe("rejected");
			}
			if (terminal === "not_required")
				source.production.configuredRequirement = false;
			expect(gap(source)).toBeNull();
		});
	}

	it("holds unknown applicability and contradictory source evidence for review", () => {
		const source = evidence();
		source.production.configuredRequirement = null;
		expect(gap(source)).toMatchObject({
			reason: "needs_review",
			canAssign: false,
			assignmentLockReasons: ["STAGE_APPLICABILITY_UNKNOWN"],
			reviewMessage: "Production requirements have not been established.",
		});
		source.production.configuredRequirement = false;
		source.production.assignments.push({
			id: 1,
			active: true,
			assignedQty: 2,
			completedQty: 0,
		});
		expect(gap(source)).toMatchObject({
			reason: "needs_review",
			canAssign: false,
		});
	});

	it("does not turn generic legacy completion strings into Production completion", () => {
		const source = evidence();
		source.legacy = { orderStatus: "completed", productionStatus: "completed" };
		expect(gap(source)?.reason).toBe("not_assigned");
	});

	it("removes active status-only completion without inventing assignment coverage", () => {
		const source = evidence();
		source.production.administrativeCompletion = {
			method: "STATUS_ONLY",
			recordedAt: "2026-09-07",
			recordId: "completion-1",
		};
		expect(gap(source)).toBeNull();
		expect(source.production.assignments).toEqual([]);
	});

	it("fails closed for unavailable freshness and zero required quantity", () => {
		const snapshot = resolveSalesPipelineSnapshot(evidence());
		snapshot.freshness.state = "unknown";
		expect(
			resolveProductionPlanningGap(snapshot, { authorizedToAssign: true }),
		).toMatchObject({ reason: "needs_review", canAssign: false });
		const source = evidence();
		source.production.requiredQty = 0;
		expect(gap(source)).toMatchObject({
			reason: "needs_review",
			canAssign: false,
		});
	});
});
