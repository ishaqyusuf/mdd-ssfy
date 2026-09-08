import { expect, test } from "bun:test";
import {
	getSalesOrderStatusPresentation,
	getSalesOrderStatusBadgeClassName,
	getSalesOrderLifecycleStatusBadgeClassName,
	getSalesOrderLifecycleStatusTone,
} from "./order-status";
import {
	resolveSalesPipelineSnapshot,
	type SalesPipelineEvidence,
} from "./sales-pipeline";

function snapshot(
	productionRequired: boolean | null,
	material: SalesPipelineEvidence["material"] = {
		applicability: "not_required",
		requiredQty: 0,
		readyQty: 0,
	},
) {
	return resolveSalesPipelineSnapshot({
		salesOrderId: 1,
		orderNo: "NEW",
		commercial: { status: "open" },
		payment: { total: 100, amountDue: 100 },
		material,
		production: {
			configuredRequirement: productionRequired,
			requiredQty: productionRequired ? 2 : 0,
			assignments: [],
			submissions: [],
		},
		fulfillment: {
			configuredRequirement: true,
			requiredQty: 2,
			packedQty: 0,
			dispatches: [],
		},
	});
}

test("new orders show their next work without inventing production requirements", () => {
	expect(getSalesOrderStatusPresentation(snapshot(false)).label).toBe("Ready");
	expect(getSalesOrderStatusPresentation(snapshot(true)).label).toBe(
		"Not Assigned",
	);
	expect(getSalesOrderStatusPresentation(snapshot(null)).label).toBe(
		"Needs Review",
	);
	expect(getSalesOrderStatusPresentation(null).label).toBe("Updating…");
});

test("inventory alerts never replace the initial saved-sale status", () => {
	for (const state of ["failed", "pending", "synced", "blocked"]) {
		expect(
			getSalesOrderStatusPresentation(
				snapshot(false, {
					applicability: "required",
					requiredQty: 2,
					readyQty: 0,
					state,
				}),
			).label,
		).toBe("Ready");
		expect(
			getSalesOrderStatusPresentation(
				snapshot(true, {
					applicability: "unknown",
					requiredQty: 0,
					readyQty: 0,
					state,
				}),
			).label,
		).toBe("Not Assigned");
	}
});

test("missing generated requirements display as updating without granting production permission", () => {
	const initial = snapshot(null);
	const pending = resolveSalesPipelineSnapshot({
		...initial.evidence,
		fulfillment: {
			...initial.evidence.fulfillment,
			configuredRequirement: null,
			requiredQty: 0,
		},
	});
	expect(getSalesOrderStatusPresentation(pending).label).toBe("Updating…");
	expect(pending.capabilities.markProductionCompleted.allowed).toBe(false);
});

test("short initial labels use normal lifecycle color metadata", () => {
	expect(getSalesOrderStatusPresentation(snapshot(false)).tone).toBe(
		getSalesOrderLifecycleStatusTone("ready_to_fulfill"),
	);
	expect(getSalesOrderStatusPresentation(snapshot(true)).tone).toBe(
		getSalesOrderLifecycleStatusTone("awaiting_production"),
	);
	expect(getSalesOrderStatusBadgeClassName("fulfillment_queued", "Ready")).toBe(
		getSalesOrderLifecycleStatusBadgeClassName("ready_to_fulfill"),
	);
	expect(getSalesOrderStatusBadgeClassName("unknown", "Not Assigned")).toBe(
		getSalesOrderLifecycleStatusBadgeClassName("awaiting_production"),
	);
	expect(getSalesOrderStatusBadgeClassName("unknown", "Updating…")).toBe(
		getSalesOrderLifecycleStatusBadgeClassName("unknown"),
	);
	expect(
		getSalesOrderStatusBadgeClassName("in_production", "In production"),
	).toBe(getSalesOrderLifecycleStatusBadgeClassName("in_production"));
});
