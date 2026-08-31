import { describe, expect, test } from "bun:test";
import { buildSalesWorkflowCancellationPreview } from "./sales-workflow-cancellation";

describe("fulfillment cancellation preview lifecycle regression", () => {
	test("ignores an unknown control status in favor of the production state", () => {
		const preview = buildSalesWorkflowCancellationPreview(
			{
				id: 26743,
				orderId: "09510PC",
				status: "active",
				prodStatus: "pending",
				controlProductionStatus: "unknown",
				updatedAt: new Date("2026-08-28T12:00:00Z"),
				deliveries: [
					{
						id: 4604,
						status: "queue",
						deliveredAt: null,
						deliveredTo: null,
						meta: null,
						updatedAt: new Date("2026-08-28T12:00:00Z"),
						items: [],
					},
				],
				productions: [],
				productionSubmissionMaterialReviews: [],
				payments: [],
				productionReadinessOverride: null,
				lineItems: [],
			} as never,
			"fulfillment",
		);

		expect(preview.currentLifecycle).toBe("fulfillment_queued");
		expect(preview.resultingLifecycle).toBe("awaiting_production");
	});
});
