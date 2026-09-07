import { describe, expect, it } from "bun:test";
import { getProductionCalendarPresentation } from "./production-calendar-presentation";
import {
	resolveSalesPipelineSnapshot,
	type SalesPipelineEvidence,
} from "./sales-pipeline";

function source(): SalesPipelineEvidence {
	return {
		salesOrderId: 1,
		orderNo: "09502PC",
		evidenceUpdatedAt: "2026-09-07T12:00:00Z",
		commercial: { status: "open" },
		payment: { total: 1, amountDue: 0 },
		material: { applicability: "required", requiredQty: 1, readyQty: 0 },
		production: {
			configuredRequirement: true,
			requiredQty: 1,
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

describe("canonical Production calendar palette", () => {
	it("keeps full-workflow declaration provenance distinct from operational quantities", () => {
		const evidence = source();
		evidence.production.administrativeCompletion = { method: "FULL_WORKFLOW", recordedAt: "2026-09-07" };
		const snapshot = resolveSalesPipelineSnapshot(evidence);
		expect(getProductionCalendarPresentation(snapshot)).toEqual({ tone: "completed", label: "Production completed", statusOnly: false });
		expect(snapshot.production.completedQty).toBe(0);
		expect(snapshot.production.assignmentIds).toEqual([]);
	});
	it("does not restore retired aggregate-only completion or fabricate a status-only declaration", () => {
		const evidence = source();
		evidence.production.aggregate = { total: 1, score: 1, percentage: 100 };
		const snapshot = resolveSalesPipelineSnapshot(evidence);
		expect(getProductionCalendarPresentation(snapshot)).toEqual({ tone: "unassigned", label: "Not assigned", statusOnly: false });
		expect(snapshot.conflicts.map((conflict) => conflict.code)).toContain("PRODUCTION_COMPLETION_AGGREGATE_DRIFT");
	});
	it("keeps completed green across unavailable material and overdue source dates", () => {
		const evidence = source();
		evidence.material = { applicability: "unknown", state: "unknown", requiredQty: 0, readyQty: 0 };
		evidence.production.assignments.push({ id: 1, active: true, assignedQty: 1, completedQty: 1, dueDate: "2024-01-01", completedAt: "2024-01-01" });
		expect(getProductionCalendarPresentation(resolveSalesPipelineSnapshot(evidence)).tone).toBe("completed");
	});
	it("moves from amber to purple to blue to emerald using canonical evidence", () => {
		const evidence = source();
		const presentation = () =>
			getProductionCalendarPresentation(resolveSalesPipelineSnapshot(evidence));
		expect(presentation().tone).toBe("unassigned");
		evidence.production.assignments.push({
			id: 1,
			active: true,
			assignedQty: 1,
			completedQty: 0,
			assignedToId: 1,
		});
		expect(presentation().tone).toBe("assigned");
		evidence.production.assignments[0]!.startedAt = "2026-09-07";
		expect(presentation().tone).toBe("in progress");
		evidence.production.assignments[0]!.completedQty = 1;
		expect(presentation()).toEqual({
			tone: "completed",
			label: "Production completed",
			statusOnly: false,
		});
	});
	it("keeps status-only green and explicit even with an open assignment and unavailable material", () => {
		const evidence = source();
		evidence.production.administrativeCompletion = {
			method: "STATUS_ONLY",
			recordedAt: "2026-09-07",
		};
		evidence.production.assignments.push({
			id: 1,
			active: true,
			assignedQty: 1,
			completedQty: 0,
		});
		expect(
			getProductionCalendarPresentation(resolveSalesPipelineSnapshot(evidence)),
		).toEqual({
			tone: "completed",
			label: "Production completed",
			statusOnly: true,
		});
	});
	it("uses rose for contradictory Production and slate for unavailable evidence", () => {
		const evidence = source();
		evidence.production.configuredRequirement = false;
		evidence.production.assignments.push({
			id: 1,
			active: true,
			assignedQty: 1,
			completedQty: 0,
		});
		expect(
			getProductionCalendarPresentation(resolveSalesPipelineSnapshot(evidence))
				.tone,
		).toBe("conflict");
		evidence.production.assignments = [];
		evidence.production.configuredRequirement = null;
		expect(
			getProductionCalendarPresentation(resolveSalesPipelineSnapshot(evidence))
				.tone,
		).toBe("unknown");
		expect(getProductionCalendarPresentation(null).tone).toBe("unknown");
	});
	it("ignores generic legacy completed strings", () => {
		const evidence = source();
		evidence.legacy = {
			orderStatus: "completed",
			productionStatus: "completed",
		};
		expect(
			getProductionCalendarPresentation(resolveSalesPipelineSnapshot(evidence))
				.tone,
		).toBe("unassigned");
	});
});
