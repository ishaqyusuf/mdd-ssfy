import { describe, expect, it } from "bun:test";
import { resolveSalesPipelineSnapshot } from "@gnd/sales/sales-pipeline";
import { projectDispatchOrderPresentation } from "./dispatch-order-presentation";

const order = {
	id: 42,
	orderId: "09530DB",
	slug: "09530DB",
	status: "open",
	prodStatus: "pending",
	grandTotal: 100,
	amountDue: 0,
	meta: {},
	payments: [],
};

const pipeline = resolveSalesPipelineSnapshot({
	salesOrderId: order.id,
	orderNo: order.orderId,
	commercial: { status: "open", deletedAt: null, archivedAt: null },
	payment: { total: 100, amountDue: 0, reviewStatus: null },
	material: { applicability: "required", requiredQty: 2, readyQty: 2 },
	production: {
		configuredRequirement: true,
		requiredQty: 2,
		assignments: [{ id: 1, active: true, assignedQty: 1, completedQty: 0 }],
		submissions: [],
		aggregate: null,
		administrativeCompletion: null,
	},
	fulfillment: {
		configuredRequirement: true,
		requiredQty: 2,
		packedQty: 0,
		dispatches: [],
		administrativeCompletion: null,
	},
});

describe("Fulfillment order headline", () => {
	it.each([
		{ SALES_PIPELINE_READ_MODE: "legacy" },
		{
			SALES_PIPELINE_READ_MODE: "shadow",
			SALES_PIPELINE_SHADOW_SAMPLE_PERCENT: "1",
		},
		{
			SALES_PIPELINE_READ_MODE: "canonical",
			SALES_PIPELINE_COHORT_PERCENT: "5",
		},
		{
			SALES_PIPELINE_READ_MODE: "canonical",
			SALES_PIPELINE_COHORT_PERCENT: "0",
		},
	])(
		"preserves the legacy headline and dimension when rollout does not select this order (%j)",
		(env) => {
			const result = projectDispatchOrderPresentation(order, null, "pending", {
				pipeline,
				env,
			});
			expect(result).toMatchObject({
				status: "awaiting_production",
				statusLabel: "Awaiting production",
				statusTone: "slate",
				productionState: "pending",
			});
		},
	);

	it("keeps the existing fallback when no canonical snapshot is available", () => {
		const result = projectDispatchOrderPresentation(order, null, "pending", {
			pipeline: null,
			env: { SALES_PIPELINE_READ_MODE: "canonical" },
		});
		expect(result).toMatchObject({
			status: "awaiting_production",
			productionState: "pending",
		});
	});

	it("shows canonical Production queued and its production dimension together", () => {
		const result = projectDispatchOrderPresentation(order, null, "pending", {
			pipeline,
			env: {
				SALES_PIPELINE_READ_MODE: "canonical",
				SALES_PIPELINE_COHORT_PERCENT: "100",
			},
		});
		expect(result).toMatchObject({
			status: "production_queued",
			statusLabel: "Production queued",
			statusTone: "amber",
			productionState: "partially_assigned",
		});
	});
});
