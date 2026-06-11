import { describe, expect, test } from "bun:test";

import { summarizeSalesInventoryOverview } from "./sales-inventory-overview";

describe("summarizeSalesInventoryOverview", () => {
	test("marks sales without synced inventory components as not synced", () => {
		const summary = summarizeSalesInventoryOverview([]);

		expect(summary).toMatchObject({
			lineItemCount: 0,
			componentCount: 0,
			readiness: "not_synced",
		});
	});

	test("prioritizes awaiting inbound when components still need received stock", () => {
		const summary = summarizeSalesInventoryOverview([
			{
				components: [
					{
						required: true,
						qty: 4,
						qtyAllocated: 1,
						qtyInbound: 3,
						qtyReceived: 1,
						status: "partially_received",
					},
					{
						required: true,
						qty: 2,
						qtyAllocated: 2,
						status: "allocated",
					},
				],
			},
		]);

		expect(summary).toMatchObject({
			componentCount: 2,
			requiredComponentCount: 2,
			qtyRequired: 6,
			qtyAllocated: 3,
			qtyInbound: 3,
			qtyReceived: 1,
			statusCounts: {
				partially_received: 1,
				allocated: 1,
			},
			readiness: "awaiting_inbound",
		});
	});

	test("marks fully allocated components as production ready", () => {
		const summary = summarizeSalesInventoryOverview([
			{
				components: [
					{
						qty: 1,
						qtyAllocated: 1,
						status: "allocated",
					},
					{
						qty: 1,
						qtyAllocated: 1,
						status: "fulfilled",
					},
				],
			},
		]);

		expect(summary.readiness).toBe("ready_for_production");
	});
});
