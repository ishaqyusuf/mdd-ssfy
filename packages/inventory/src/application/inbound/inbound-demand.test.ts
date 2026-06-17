import { describe, expect, test } from "bun:test";

import {
	applyOrderInboundStatusToInventoryDemand,
	buildInboundStatusDemandReconciliation,
	planInboundReceiptDelta,
} from "./inbound-demand";

describe("planInboundReceiptDelta", () => {
	test("treats an identical receive retry as a duplicate no-op", () => {
		const plan = planInboundReceiptDelta({
			plannedQty: 10,
			previousGoodQty: 10,
			previousIssueQty: 0,
			qtyReceived: 10,
		});

		expect(plan).toEqual({
			targetGoodQty: 10,
			targetIssueQty: 0,
			targetReceivedQty: 10,
			deltaGoodQty: 0,
			deltaIssueQty: 0,
			deltaReceivedQty: 0,
			duplicate: true,
		});
	});

	test("processes only the remaining good quantity on partial receive retry", () => {
		const plan = planInboundReceiptDelta({
			plannedQty: 10,
			previousGoodQty: 4,
			previousIssueQty: 0,
			qtyReceived: 10,
		});

		expect(plan).toEqual({
			targetGoodQty: 10,
			targetIssueQty: 0,
			targetReceivedQty: 10,
			deltaGoodQty: 6,
			deltaIssueQty: 0,
			deltaReceivedQty: 6,
			duplicate: false,
		});
	});

	test("does not duplicate issue rows on repeated issue receive", () => {
		const plan = planInboundReceiptDelta({
			plannedQty: 10,
			previousGoodQty: 8,
			previousIssueQty: 2,
			qtyReceived: 10,
			qtyIssue: 2,
		});

		expect(plan).toEqual({
			targetGoodQty: 8,
			targetIssueQty: 2,
			targetReceivedQty: 10,
			deltaGoodQty: 0,
			deltaIssueQty: 0,
			deltaReceivedQty: 0,
			duplicate: true,
		});
	});

	test("keeps existing issue quantity when completing the good remainder", () => {
		const plan = planInboundReceiptDelta({
			plannedQty: 10,
			previousGoodQty: 3,
			previousIssueQty: 2,
		});

		expect(plan).toEqual({
			targetGoodQty: 8,
			targetIssueQty: 2,
			targetReceivedQty: 10,
			deltaGoodQty: 5,
			deltaIssueQty: 0,
			deltaReceivedQty: 5,
			duplicate: false,
		});
	});
});

describe("buildInboundStatusDemandReconciliation", () => {
	test("flags order-level inbound statuses that have no inventory demand rows", () => {
		const report = buildInboundStatusDemandReconciliation([
			{
				id: 101,
				orderId: "ORD-101",
				inventoryStatus: "PENDING ORDER",
				lineItems: [],
			},
			{
				id: 102,
				orderId: "ORD-102",
				inventoryStatus: "ORDERED",
				lineItems: [],
			},
		]);

		expect(report.summary.issueCount).toBe(2);
		expect(report.summary.orderStatusWithoutDemandCount).toBe(2);
		expect(report.rows.map((row) => row.issue)).toEqual([
			"order_status_without_inventory_demand",
			"order_status_without_inventory_demand",
		]);
	});

	test("flags available orders that still have open inventory inbound demand", () => {
		const report = buildInboundStatusDemandReconciliation([
			{
				id: 201,
				orderId: "ORD-201",
				inventoryStatus: "AVAILABLE",
				lineItems: [
					{
						id: 301,
						title: "Door",
						components: [
							{
								id: 401,
								inventoryVariant: {
									id: 501,
									sku: "SKU-DOOR",
									inventory: {
										id: 601,
										name: "Door slab",
									},
								},
								inboundDemands: [
									{
										id: 701,
										qty: 5,
										qtyReceived: 2,
										status: "pending",
									},
								],
							},
						],
					},
				],
			},
		]);

		expect(report.summary.issueCount).toBe(1);
		expect(report.summary.availableWithDemandCount).toBe(1);
		expect(report.summary.openDemandQty).toBe(3);
		expect(report.rows[0]?.severity).toBe("critical");
		expect(report.rows[0]?.demandPreview).toEqual([
			{
				demandId: 701,
				lineItemId: 301,
				lineTitle: "Door",
				inventoryName: "Door slab",
				sku: "SKU-DOOR",
				qtyOpen: 3,
				status: "pending",
			},
		]);
	});

	test("flags pending-order prompts when inventory demand is already ordered", () => {
		const report = buildInboundStatusDemandReconciliation([
			{
				id: 301,
				orderId: "ORD-301",
				inventoryStatus: "PENDING ORDER",
				lineItems: [
					{
						id: 401,
						components: [
							{
								id: 501,
								inboundDemands: [
									{
										id: 601,
										qty: 4,
										qtyReceived: 0,
										status: "ordered",
										inboundShipmentItemId: 701,
									},
								],
							},
						],
					},
				],
			},
		]);

		expect(report.summary.issueCount).toBe(1);
		expect(report.summary.pendingOrderWithOrderedDemandCount).toBe(1);
		expect(report.rows[0]?.issue).toBe(
			"pending_order_has_ordered_inventory_demand",
		);
		expect(report.rows[0]?.orderedDemandCount).toBe(1);
	});

	test("does not flag aligned order statuses and demand rows", () => {
		const report = buildInboundStatusDemandReconciliation([
			{
				id: 401,
				inventoryStatus: "ORDERED",
				lineItems: [
					{
						id: 501,
						components: [
							{
								id: 601,
								inboundDemands: [
									{
										id: 701,
										qty: 4,
										qtyReceived: 0,
										status: "ordered",
									},
								],
							},
						],
					},
				],
			},
			{
				id: 402,
				inventoryStatus: "AVAILABLE",
				lineItems: [],
			},
		]);

		expect(report.summary).toEqual({
			reviewedOrderCount: 2,
			issueCount: 0,
			orderStatusWithoutDemandCount: 0,
			availableWithDemandCount: 0,
			pendingOrderWithOrderedDemandCount: 0,
			openDemandQty: 0,
		});
	});
});

describe("applyOrderInboundStatusToInventoryDemand", () => {
	test("maps ordered prompts onto open inventory demand rows", async () => {
		const calls: unknown[] = [];
		const result = await applyOrderInboundStatusToInventoryDemand(
			{
				inboundDemand: {
					updateMany: async (input: unknown) => {
						calls.push(input);
						return { count: 2 };
					},
				},
			} as any,
			{
				saleId: 9001,
				status: "ORDERED",
			},
		);

		expect(result).toEqual({
			saleId: 9001,
			status: "ORDERED",
			updatedDemandCount: 2,
			skipped: false,
		});
		expect(calls).toEqual([
			{
				where: {
					deletedAt: null,
					status: {
						in: ["pending", "ordered"],
					},
					lineItemComponent: {
						parent: {
							saleId: 9001,
							deletedAt: null,
						},
					},
				},
				data: {
					status: "ordered",
					notes: "Order inbound prompt: ORDERED",
				},
			},
		]);
	});

	test("does not cancel shortage demand when an order prompt says available", async () => {
		const result = await applyOrderInboundStatusToInventoryDemand(
			{
				inboundDemand: {
					updateMany: async () => {
						throw new Error("Should not mutate demand");
					},
				},
			} as any,
			{
				saleId: 9002,
				status: "AVAILABLE",
			},
		);

		expect(result).toEqual({
			saleId: 9002,
			status: "AVAILABLE",
			updatedDemandCount: 0,
			skipped: true,
			reason: "available_status_does_not_mutate_shortage_demand",
		});
	});

	test("does not widen invalid selected demand ids into an order-wide ordered update", async () => {
		const result = await applyOrderInboundStatusToInventoryDemand(
			{
				inboundDemand: {
					updateMany: async () => {
						throw new Error("Should not mutate demand");
					},
				},
			} as any,
			{
				saleId: 9006,
				status: "ORDERED",
				demandIds: [0, -1, 702.5],
			},
		);

		expect(result).toEqual({
			saleId: 9006,
			status: "ORDERED",
			updatedDemandCount: 0,
			skipped: true,
			reason: "selected_demand_ids_invalid",
		});
	});

	test("does not widen invalid selected demand ids into an available cancellation", async () => {
		const result = await applyOrderInboundStatusToInventoryDemand(
			{
				inboundDemand: {
					updateMany: async () => {
						throw new Error("Should not mutate demand");
					},
				},
			} as any,
			{
				saleId: 9007,
				status: "AVAILABLE",
				demandIds: [0, -1, 702.5],
			},
		);

		expect(result).toEqual({
			saleId: 9007,
			status: "AVAILABLE",
			updatedDemandCount: 0,
			skipped: true,
			reason: "selected_demand_ids_invalid",
		});
	});

	test("cancels selected mutable demand rows when a line prompt says available", async () => {
		const calls: unknown[] = [];
		const result = await applyOrderInboundStatusToInventoryDemand(
			{
				inboundDemand: {
					updateMany: async (input: unknown) => {
						calls.push(input);
						return { count: 2 };
					},
				},
			} as any,
			{
				saleId: 9004,
				status: "AVAILABLE",
				demandIds: [701, 701, 0, -1, 702.5, 703],
			},
		);

		expect(result).toEqual({
			saleId: 9004,
			status: "AVAILABLE",
			updatedDemandCount: 2,
			skipped: false,
		});
		expect(calls).toEqual([
			{
				where: {
					deletedAt: null,
					status: {
						in: ["pending", "ordered"],
					},
					id: {
						in: [701, 703],
					},
					lineItemComponent: {
						parent: {
							saleId: 9004,
							deletedAt: null,
						},
					},
				},
				data: {
					status: "cancelled",
					notes: "Order inbound prompt: AVAILABLE",
				},
			},
		]);
	});

	test("does not downgrade partially received or shipment-linked demand for pending prompts", async () => {
		const calls: unknown[] = [];
		const result = await applyOrderInboundStatusToInventoryDemand(
			{
				inboundDemand: {
					updateMany: async (input: unknown) => {
						calls.push(input);
						return { count: 1 };
					},
				},
			} as any,
			{
				saleId: 9003,
				status: "PENDING ORDER",
			},
		);

		expect(result).toEqual({
			saleId: 9003,
			status: "PENDING ORDER",
			updatedDemandCount: 1,
			skipped: false,
		});
		expect(calls).toEqual([
			{
				where: {
					deletedAt: null,
					status: {
						in: ["pending", "ordered"],
					},
					inboundShipmentItemId: null,
					lineItemComponent: {
						parent: {
							saleId: 9003,
							deletedAt: null,
						},
					},
				},
				data: {
					status: "pending",
					notes: "Order inbound prompt: PENDING ORDER",
				},
			},
		]);
	});

	test("scopes selected pending prompts to selected unassigned demand rows", async () => {
		const calls: unknown[] = [];
		const result = await applyOrderInboundStatusToInventoryDemand(
			{
				inboundDemand: {
					updateMany: async (input: unknown) => {
						calls.push(input);
						return { count: 1 };
					},
				},
			} as any,
			{
				saleId: 9005,
				status: "PENDING ORDER",
				demandIds: [801, 802],
			},
		);

		expect(result).toEqual({
			saleId: 9005,
			status: "PENDING ORDER",
			updatedDemandCount: 1,
			skipped: false,
		});
		expect(calls).toEqual([
			{
				where: {
					deletedAt: null,
					status: {
						in: ["pending", "ordered"],
					},
					id: {
						in: [801, 802],
					},
					inboundShipmentItemId: null,
					lineItemComponent: {
						parent: {
							saleId: 9005,
							deletedAt: null,
						},
					},
				},
				data: {
					status: "pending",
					notes: "Order inbound prompt: PENDING ORDER",
				},
			},
		]);
	});
});
