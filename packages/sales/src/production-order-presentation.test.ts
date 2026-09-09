import { expect, test } from "bun:test";
import {
	resolveSalesPipelineSnapshot,
	type SalesPipelineEvidence,
} from "./sales-pipeline";
import { getProductionOrderPresentation } from "./production-order-presentation";

function evidence(): SalesPipelineEvidence {
	return {
		salesOrderId: 1,
		orderNo: "fixture",
		evidenceUpdatedAt: "2026-09-08",
		commercial: { status: "open" },
		payment: { total: 1, amountDue: 0 },
		material: { applicability: "required", requiredQty: 2, readyQty: 2 },
		production: {
			configuredRequirement: true,
			requiredQty: 2,
			assignments: [{ id: 1, active: true, assignedQty: 2, completedQty: 0 }],
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
test("full reported work keeps completion primary and pending review secondary", () => {
	const source = evidence();
	source.production.submissions = [
		{
			id: 1,
			assignmentId: 1,
			active: true,
			quantity: 2,
			reviewStatus: "PENDING",
		},
	];
	const snapshot = resolveSalesPipelineSnapshot(source),
		before = JSON.stringify(snapshot);
	const view = getProductionOrderPresentation(snapshot);
	expect(view.primary.label).toBe("Production completed");
	expect(view.primary.basis).toBe("reported");
	expect(view.attention.map((x) => x.code)).toContain("review_pending");
	expect(snapshot.production.completedQty).toBe(0);
	expect(JSON.stringify(snapshot)).toBe(before);
});
test("material shortage does not replace Assigned and review reasons are deduplicated", () => {
	const source = evidence();
	source.material.readyQty = 0;
	const view = getProductionOrderPresentation(
		resolveSalesPipelineSnapshot(source),
		["ALLOCATION_REVIEW", "ALLOCATION_REVIEW"],
	);
	expect(view.primary.label).toBe("Assigned");
	expect(view.attention.map((x) => x.code)).toEqual([
		"materials_missing",
		"allocation_review",
	]);
});
test("partial reported quantity is not labelled completed", () => {
	const source = evidence();
	source.production.submissions = [
		{ id: 1, active: true, quantity: 1, reviewStatus: "PENDING_REVIEW" },
	];
	const view = getProductionOrderPresentation(
		resolveSalesPipelineSnapshot(source),
	);
	expect(view.primary.label).toBe("In production");
	expect(view.primary.detail).toBe("1 of 2 submitted");
});
test("approved completion and Material Ready do not produce a redundant alert", () => {
	const source = evidence();
	source.production.submissions = [
		{ id: 1, active: true, quantity: 2, reviewStatus: "APPROVED" },
	];
	const view = getProductionOrderPresentation(
		resolveSalesPipelineSnapshot(source),
	);
	expect(view.primary.label).toBe("Production completed");
	expect(view.primary.basis).toBe("finalized");
	expect(view.attention).toEqual([]);
});
test("retracted and rejected submissions do not count as reported progress", () => {
	const source = evidence();
	source.production.submissions = [
		{ id: 1, active: false, quantity: 2, reviewStatus: "PENDING" },
		{ id: 2, active: true, quantity: 2, reviewStatus: "REJECTED" },
	];
	const view = getProductionOrderPresentation(
		resolveSalesPipelineSnapshot(source),
	);
	expect(view.primary.label).toBe("Assigned");
	expect(view.reportedQty).toBe(0);
});
test("missing evidence stays explicit rather than fabricating progress", () => {
	const view = getProductionOrderPresentation(null);
	expect(view.primary.label).toBe("Status unavailable");
	expect(view.attention[0]?.code).toBe("evidence_unavailable");
});
test("stale evidence retains known review actions without asserting completion", () => {
	const snapshot = resolveSalesPipelineSnapshot(evidence());
	snapshot.freshness.state = "stale";
	const view = getProductionOrderPresentation(snapshot, ["ALLOCATION_REVIEW"]);
	expect(view.primary.code).toBe("unknown");
	expect(view.attention.map((reason) => reason.code)).toEqual([
		"evidence_unavailable",
		"allocation_review",
	]);
});
