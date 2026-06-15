import { describe, expect, test } from "bun:test";

import {
	buildInventoryReconciliationReportFromLines,
	expectedComponentFulfillmentStatus,
	expectedLineShipmentAllocationDrift,
} from "./inventory-reconciliation-report";

describe("expectedLineShipmentAllocationDrift", () => {
	test("does not drift when completed delivery matches consumed inventory units", () => {
		const drift = expectedLineShipmentAllocationDrift({
			qty: 10,
			salesItem: {
				qty: 10,
				itemDeliveries: [
					{
						qty: 6,
						status: "completed",
						delivery: {
							status: "completed",
						},
					},
				],
			},
			components: [
				{
					qty: 10,
					stockAllocations: [{ qty: 6, status: "consumed" }],
				},
			],
		});

		expect(drift).toEqual({
			shippedQty: 6,
			consumedQty: 6,
			delta: 0,
			drift: false,
		});
	});

	test("reports drift when completed delivery exceeds consumed inventory units", () => {
		const drift = expectedLineShipmentAllocationDrift({
			qty: 10,
			salesItem: {
				qty: 10,
				itemDeliveries: [
					{
						qty: 6,
						status: "completed",
					},
				],
			},
			components: [
				{
					qty: 10,
					stockAllocations: [{ qty: 4, status: "consumed" }],
				},
			],
		});

		expect(drift).toEqual({
			shippedQty: 6,
			consumedQty: 4,
			delta: 2,
			drift: true,
		});
	});
});

describe("expectedComponentFulfillmentStatus", () => {
	test("derives allocation, inbound, received, and cancelled states", () => {
		expect(
			expectedComponentFulfillmentStatus({
				qty: 5,
				stockAllocations: [{ qty: 5, status: "reserved" }],
			}),
		).toBe("allocated");
		expect(
			expectedComponentFulfillmentStatus({
				qty: 5,
				inboundDemands: [{ qty: 5, qtyReceived: 0, status: "ordered" }],
			}),
		).toBe("inbound_required");
		expect(
			expectedComponentFulfillmentStatus({
				qty: 5,
				inboundDemands: [{ qty: 5, qtyReceived: 2, status: "ordered" }],
			}),
		).toBe("partially_received");
		expect(expectedComponentFulfillmentStatus({ qty: 0 })).toBe("cancelled");
	});
});

describe("buildInventoryReconciliationReportFromLines", () => {
	test("returns no drift for synced inventory sales lines", () => {
		const report = buildInventoryReconciliationReportFromLines([
			{
				id: 1,
				qty: 10,
				saleId: 100,
				sale: {
					id: 100,
					orderId: "0001",
				},
				salesItemId: 200,
				salesItem: {
					id: 200,
					qty: 10,
					itemDeliveries: [
						{
							qty: 6,
							status: "completed",
						},
					],
				},
				components: [
					{
						id: 300,
						qty: 10,
						status: "allocated",
						stockAllocations: [
							{ qty: 4, status: "reserved" },
							{ qty: 6, status: "consumed" },
						],
					},
				],
			},
		]);

		expect(report.mode).toBe("dry-run");
		expect(report.totalDriftCount).toBe(0);
		expect(report.domains.sales_inventory_sync.checkedCount).toBe(1);
		expect(report.domains.shipment_allocation.checkedCount).toBe(1);
		expect(report.domains.component_fulfillment.checkedCount).toBe(1);
	});

	test("samples missing component rows and marks dependent domains as skipped", () => {
		const report = buildInventoryReconciliationReportFromLines([
			{
				id: 1,
				qty: 2,
				saleId: 100,
				sale: {
					id: 100,
					orderId: "0001",
				},
				salesItemId: 200,
				salesItem: {
					id: 200,
					qty: 2,
					itemDeliveries: [],
				},
				components: [],
			},
		]);

		expect(report.totalDriftCount).toBe(1);
		expect(report.domains.sales_inventory_sync.severity).toBe("error");
		expect(report.domains.sales_inventory_sync.samples[0]).toMatchObject({
			domain: "sales_inventory_sync",
			lineItemId: 1,
			salesItemId: 200,
			message: "Inventory line has no component rows.",
		});
		expect(report.domains.shipment_allocation.skippedCount).toBe(1);
		expect(report.domains.component_fulfillment.skippedReasons).toContain(
			"Inventory line has no component rows to compare with fulfillment state.",
		);
	});

	test("samples shipment/allocation drift and component fulfillment drift", () => {
		const report = buildInventoryReconciliationReportFromLines([
			{
				id: 1,
				qty: 10,
				saleId: 100,
				sale: {
					id: 100,
					orderId: "0001",
				},
				salesItemId: 200,
				salesItem: {
					id: 200,
					qty: 10,
					itemDeliveries: [
						{
							qty: 6,
							status: "completed",
						},
					],
				},
				components: [
					{
						id: 300,
						qty: 10,
						status: "allocated",
						stockAllocations: [{ qty: 4, status: "consumed" }],
					},
				],
			},
		]);

		expect(report.totalDriftCount).toBe(2);
		expect(report.domains.shipment_allocation.samples[0]).toMatchObject({
			severity: "error",
			expected: 6,
			actual: 4,
		});
		expect(report.domains.component_fulfillment.samples[0]).toMatchObject({
			severity: "warning",
			componentId: 300,
			expected: "pending",
			actual: "allocated",
		});
	});

	test("preserves bounded cursor metadata", () => {
		const report = buildInventoryReconciliationReportFromLines(
			[
				{
					id: 10,
					qty: 1,
					salesItem: {
						id: 20,
						itemDeliveries: [],
					},
					components: [
						{
							id: 30,
							qty: 1,
							status: "pending",
						},
					],
				},
			],
			{
				nextCursorId: 10,
				hasMore: true,
				sampleLimit: 1,
			},
		);

		expect(report.nextCursorId).toBe(10);
		expect(report.hasMore).toBe(true);
	});
});
