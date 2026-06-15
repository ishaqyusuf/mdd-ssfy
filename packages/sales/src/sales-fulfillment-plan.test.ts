import { describe, expect, test } from "bun:test";

import {
	applyHoldUntilCompleteToShipmentPlan,
	buildSalesPartialShipmentQueue,
	buildSalesBackorderQueue,
	buildSalesProductionPlan,
	isLineHeldUntilComplete,
	planAvailableShipmentForLine,
	planInventoryDispatchAllocationTransition,
	planReceivedBackorderAllocation,
	summarizeSalesFulfillmentPlan,
} from "./sales-fulfillment-plan";

describe("buildSalesBackorderQueue", () => {
	test("lists awaiting inbound and backordered lines with blocker components", () => {
		const queue = buildSalesBackorderQueue([
			{
				id: 1,
				title: "Door package",
				qty: 10,
				sale: {
					id: 100,
					orderId: "0001",
					customer: {
						name: "Ada Customer",
					},
				},
				salesItem: {
					id: 200,
					itemDeliveries: [],
				},
				components: [
					{
						id: 10,
						required: true,
						qty: 10,
						inventory: {
							id: 500,
							name: "Hinge set",
						},
						inventoryVariant: {
							id: 501,
							sku: "HINGE-BLK",
							description: "Black hinge set",
						},
						inventoryCategory: {
							id: 502,
							title: "Hardware",
						},
						stockAllocations: [{ qty: 6, status: "reserved" }],
						inboundDemands: [{ qty: 4, qtyReceived: 0, status: "ordered" }],
					},
				],
			},
			{
				id: 2,
				title: "Fulfilled line",
				qty: 1,
				salesItem: {
					id: 201,
					itemDeliveries: [
						{
							qty: 1,
							packingStatus: "packed",
							delivery: {
								status: "completed",
								deliveredAt: "2026-06-11T10:00:00.000Z",
							},
						},
					],
				},
				components: [
					{
						id: 11,
						required: true,
						qty: 1,
						stockAllocations: [{ qty: 1, status: "consumed" }],
					},
				],
			},
		]);

		expect(queue.summary.totalCount).toBe(1);
		expect(queue.summary.statusCounts.awaiting_inbound).toBe(1);
		expect(queue.items[0]).toMatchObject({
			salesOrderId: 100,
			orderId: "0001",
			customerName: "Ada Customer",
			lineItemId: 1,
			salesItemId: 200,
			status: "awaiting_inbound",
			backorderedQty: 4,
			inboundQty: 4,
		});
		expect(queue.items[0]?.blockerComponents).toHaveLength(1);
		expect(queue.items[0]?.blockerComponents[0]?.id).toBe(10);
		expect(queue.items[0]?.blockerComponents[0]).toMatchObject({
			inventoryId: 500,
			inventoryVariantId: 501,
			inventoryName: "Hinge set",
			inventoryVariantSku: "HINGE-BLK",
			inventoryCategoryName: "Hardware",
			componentName: "Hinge set",
		});
	});

	test("can filter to remaining shipment lines", () => {
		const queue = buildSalesBackorderQueue(
			[
				{
					id: 1,
					qty: 10,
					salesItem: {
						id: 200,
						itemDeliveries: [
							{
								qty: 6,
								packingStatus: "packed",
								delivery: {
									status: "completed",
									deliveredAt: "2026-06-11T10:00:00.000Z",
								},
							},
						],
					},
					components: [
						{
							id: 10,
							required: true,
							qty: 10,
							stockAllocations: [{ qty: 6, status: "consumed" }],
							inboundDemands: [{ qty: 4, qtyReceived: 4, status: "received" }],
						},
					],
				},
				{
					id: 2,
					qty: 5,
					components: [
						{
							id: 11,
							required: true,
							qty: 5,
							stockAllocations: [{ qty: 2, status: "reserved" }],
						},
					],
				},
			],
			{
				statuses: ["ready_to_ship_remaining"],
			},
		);

		expect(queue.summary.totalCount).toBe(1);
		expect(queue.items[0]?.status).toBe("ready_to_ship_remaining");
		expect(queue.items[0]?.remainingQty).toBe(4);
	});

	test("does not list lines fully covered by pending allocation review as backordered", () => {
		const queue = buildSalesBackorderQueue([
			{
				id: 1,
				title: "Door package",
				qty: 10,
				salesItem: {
					id: 200,
					itemDeliveries: [],
				},
				components: [
					{
						id: 10,
						required: true,
						qty: 10,
						stockAllocations: [{ qty: 10, status: "pending_review" }],
					},
				],
			},
		]);

		expect(queue.summary.totalCount).toBe(0);
		expect(queue.summary.backorderedQty).toBe(0);
	});
});

describe("hold until complete partial shipment planning", () => {
	test("marks held partially available lines as not shippable", () => {
		const fulfillment = summarizeSalesFulfillmentPlan([
			{
				id: 1,
				qty: 10,
				meta: {
					fulfillment: {
						holdUntilComplete: true,
					},
				},
				salesItem: {
					id: 200,
					itemDeliveries: [],
				},
				components: [
					{
						id: 10,
						required: true,
						qty: 10,
						stockAllocations: [{ qty: 6, status: "reserved" }],
					},
				],
			},
		]);

		expect(fulfillment.lines[0]).toMatchObject({
			holdUntilComplete: true,
			availableToShipQty: 6,
			canShipNow: false,
			heldBackQty: 10,
		});
		expect(
			isLineHeldUntilComplete({
				fulfillment: {
					holdUntilComplete: true,
				},
			}),
		).toBe(true);
	});

	test("allows held lines to ship when full remaining quantity is available", () => {
		const fulfillment = summarizeSalesFulfillmentPlan([
			{
				id: 1,
				qty: 10,
				meta: {
					fulfillment: {
						holdUntilComplete: true,
					},
				},
				salesItem: {
					id: 200,
					itemDeliveries: [],
				},
				components: [
					{
						id: 10,
						required: true,
						qty: 10,
						stockAllocations: [{ qty: 10, status: "reserved" }],
					},
				],
			},
		]);

		expect(fulfillment.lines[0]).toMatchObject({
			holdUntilComplete: true,
			availableToShipQty: 10,
			canShipNow: true,
			heldBackQty: 0,
		});
	});

	test("hold decision blocks partial ship plans but not complete ship plans", () => {
		const partial = planAvailableShipmentForLine({
			orderedQty: 10,
			components: [
				{
					componentId: 10,
					required: true,
					orderedQty: 10,
					availableQty: 6,
				},
			],
		});
		const complete = planAvailableShipmentForLine({
			orderedQty: 10,
			components: [
				{
					componentId: 10,
					required: true,
					orderedQty: 10,
					availableQty: 10,
				},
			],
		});

		expect(applyHoldUntilCompleteToShipmentPlan(partial, true)).toEqual({
			blocked: true,
			reason: "hold_until_complete",
			shipQty: 0,
			backorderedQty: 0,
			heldQty: 10,
		});
		expect(applyHoldUntilCompleteToShipmentPlan(complete, true)).toEqual({
			blocked: false,
			reason: null,
			shipQty: 10,
			backorderedQty: 0,
			heldQty: 0,
		});
	});

	test("builds partial shipment queue with available and held statuses", () => {
		const queue = buildSalesPartialShipmentQueue([
			{
				id: 1,
				qty: 10,
				sale: {
					id: 100,
					orderId: "0001",
				},
				salesItem: {
					id: 200,
					itemDeliveries: [],
				},
				components: [
					{
						id: 10,
						required: true,
						qty: 10,
						stockAllocations: [{ qty: 6, status: "reserved" }],
					},
				],
			},
			{
				id: 2,
				qty: 10,
				meta: {
					fulfillment: {
						holdUntilComplete: true,
					},
				},
				sale: {
					id: 101,
					orderId: "0002",
				},
				salesItem: {
					id: 201,
					itemDeliveries: [],
				},
				components: [
					{
						id: 11,
						required: true,
						qty: 10,
						stockAllocations: [{ qty: 6, status: "reserved" }],
					},
				],
			},
		]);

		expect(queue.summary.totalCount).toBe(2);
		expect(queue.summary.statusCounts.available_now).toBe(1);
		expect(queue.summary.statusCounts.held_until_complete).toBe(1);
		expect(queue.summary.heldLineCount).toBe(1);
		expect(queue.items.map((item) => item.partialStatus)).toEqual([
			"available_now",
			"held_until_complete",
		]);
	});
});

describe("buildSalesProductionPlan", () => {
	test("groups BOM components by sale, item, component, supplier, and stock status", () => {
		const plan = buildSalesProductionPlan([
			{
				id: 1,
				title: "Door package",
				qty: 2,
				sale: {
					id: 100,
					orderId: "0001",
					customer: {
						businessName: "Ada Builds",
					},
				},
				salesItem: {
					id: 200,
					itemDeliveries: [],
				},
				components: [
					{
						id: 10,
						required: true,
						qty: 2,
						inventory: {
							id: 500,
							name: "Door slab",
							defaultSupplier: {
								id: 700,
								name: "Door Co",
							},
						},
						inventoryVariant: {
							id: 501,
							sku: "SLAB-36",
						},
						stockAllocations: [{ qty: 2, status: "reserved" }],
					},
					{
						id: 11,
						required: true,
						qty: 2,
						inventory: {
							id: 510,
							name: "Hinge set",
							defaultSupplier: {
								id: 701,
								name: "Hardware Co",
							},
						},
						inventoryVariant: {
							id: 511,
							sku: "HINGE-BLK",
						},
						stockAllocations: [{ qty: 1, status: "reserved" }],
						inboundDemands: [{ qty: 1, qtyReceived: 0, status: "ordered" }],
					},
				],
			},
			{
				id: 2,
				title: "Trim package",
				qty: 1,
				sale: {
					id: 101,
					orderId: "0002",
					customer: {
						name: "Grace Customer",
					},
				},
				salesItem: {
					id: 201,
					itemDeliveries: [],
				},
				components: [
					{
						id: 12,
						required: true,
						qty: 1,
						inventory: {
							id: 520,
							name: "Casing",
							defaultSupplier: {
								id: 700,
								name: "Door Co",
							},
						},
						inventoryVariant: {
							id: 521,
							sku: "CASE-PRM",
						},
						stockAllocations: [{ qty: 1, status: "approved" }],
					},
				],
			},
		]);

		expect(plan.summary).toMatchObject({
			lineCount: 2,
			componentCount: 3,
			readyLineCount: 1,
			blockedLineCount: 1,
			supplierCount: 2,
			readiness: "awaiting_inbound",
			allocatedQty: 4,
			inboundQty: 1,
			backorderedQty: 1,
		});
		expect(plan.summary.stockStatusCounts.allocated).toBe(2);
		expect(plan.summary.stockStatusCounts.awaiting_inbound).toBe(1);
		expect(plan.groups.bySale).toHaveLength(2);
		expect(plan.groups.bySalesItem).toHaveLength(2);
		expect(plan.groups.byComponent).toHaveLength(3);
		expect(plan.groups.bySupplier).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					supplierId: 700,
					label: "Door Co",
					componentCount: 2,
				}),
				expect.objectContaining({
					supplierId: 701,
					label: "Hardware Co",
					componentCount: 1,
					inboundQty: 1,
				}),
			]),
		);
		expect(plan.groups.byStockStatus).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					stockStatus: "allocated",
					componentCount: 2,
				}),
				expect.objectContaining({
					stockStatus: "awaiting_inbound",
					componentCount: 1,
				}),
			]),
		);
	});

	test("can filter components by production readiness", () => {
		const plan = buildSalesProductionPlan(
			[
				{
					id: 1,
					qty: 2,
					components: [
						{
							id: 10,
							required: true,
							qty: 2,
							stockAllocations: [{ qty: 2, status: "reserved" }],
						},
						{
							id: 11,
							required: true,
							qty: 2,
							stockAllocations: [{ qty: 1, status: "reserved" }],
							inboundDemands: [
								{ qty: 1, qtyReceived: 0, status: "ordered" },
							],
						},
					],
				},
			],
			{
				readinesses: ["awaiting_inbound"],
			},
		);

		expect(plan.summary.componentCount).toBe(1);
		expect(plan.components[0]).toMatchObject({
			componentId: 11,
			stockStatus: "awaiting_inbound",
			readiness: "awaiting_inbound",
			lineReadiness: "awaiting_inbound",
		});
	});
});

describe("planReceivedBackorderAllocation", () => {
	test("reserves the received stock needed to cover remaining component shortage", () => {
		const plan = planReceivedBackorderAllocation({
			requiredQty: 10,
			allocatedQty: 6,
			receivedQty: 4,
			availableStockQty: 4,
		});

		expect(plan).toEqual({
			shortageQty: 4,
			reserveQty: 4,
			remainingBackorderQty: 0,
		});
	});

	test("does not reserve more than available stock or remaining shortage", () => {
		const plan = planReceivedBackorderAllocation({
			requiredQty: 10,
			allocatedQty: 4,
			receivedQty: 10,
			availableStockQty: 3,
		});

		expect(plan).toEqual({
			shortageQty: 6,
			reserveQty: 3,
			remainingBackorderQty: 3,
		});
	});

	test("does not reserve again when received shortage is already covered", () => {
		const plan = planReceivedBackorderAllocation({
			requiredQty: 10,
			allocatedQty: 10,
			receivedQty: 10,
			availableStockQty: 10,
		});

		expect(plan).toEqual({
			shortageQty: 0,
			reserveQty: 0,
			remainingBackorderQty: 0,
		});
	});
});

describe("planInventoryDispatchAllocationTransition", () => {
	test("assign reserves approved allocations", () => {
		expect(
			planInventoryDispatchAllocationTransition({
				action: "assign",
				status: "approved",
			}),
		).toMatchObject({
			transition: true,
			toStatus: "reserved",
			reason: "ready",
		});
	});

	test("pack only moves reserved allocations to picked", () => {
		expect(
			planInventoryDispatchAllocationTransition({
				action: "pack",
				status: "reserved",
			}),
		).toMatchObject({
			transition: true,
			toStatus: "picked",
		});
		expect(
			planInventoryDispatchAllocationTransition({
				action: "pack",
				status: "approved",
			}),
		).toMatchObject({
			transition: false,
			reason: "not_reserved_for_pack",
		});
	});

	test("release does not reopen consumed or pending review allocations", () => {
		expect(
			planInventoryDispatchAllocationTransition({
				action: "release",
				status: "picked",
			}),
		).toMatchObject({
			transition: true,
			toStatus: "released",
		});
		expect(
			planInventoryDispatchAllocationTransition({
				action: "release",
				status: "consumed",
			}),
		).toMatchObject({
			transition: false,
			reason: "already_consumed",
		});
		expect(
			planInventoryDispatchAllocationTransition({
				action: "assign",
				status: "pending_review",
			}),
		).toMatchObject({
			transition: false,
			reason: "pending_review_not_dispatchable",
		});
	});
});

describe("planAvailableShipmentForLine", () => {
	test("ships only the quantity available across required components", () => {
		const plan = planAvailableShipmentForLine({
			orderedQty: 10,
			alreadyShippedQty: 0,
			components: [
				{
					componentId: 1,
					required: true,
					orderedQty: 10,
					availableQty: 6,
					inventoryVariantId: 101,
				},
				{
					componentId: 2,
					required: true,
					orderedQty: 20,
					availableQty: 20,
					inventoryVariantId: 102,
				},
			],
		});

		expect(plan.shipQty).toBe(6);
		expect(plan.backorderedQty).toBe(4);
		expect(plan.components).toEqual([
			{
				componentId: 1,
				consumeQty: 6,
				backorderedQty: 4,
				inventoryVariantId: 101,
			},
			{
				componentId: 2,
				consumeQty: 12,
				backorderedQty: 8,
				inventoryVariantId: 102,
			},
		]);
	});

	test("does not ship beyond the remaining unshipped quantity", () => {
		const plan = planAvailableShipmentForLine({
			orderedQty: 10,
			alreadyShippedQty: 6,
			components: [
				{
					componentId: 1,
					required: true,
					orderedQty: 10,
					availableQty: 10,
				},
			],
		});

		expect(plan.remainingQty).toBe(4);
		expect(plan.shipQty).toBe(4);
		expect(plan.backorderedQty).toBe(0);
		expect(plan.components[0]?.consumeQty).toBe(4);
	});
});

describe("summarizeSalesFulfillmentPlan", () => {
	test("marks open inbound shortages as awaiting inbound", () => {
		const plan = summarizeSalesFulfillmentPlan([
			{
				id: 1,
				title: "Door package",
				qty: 10,
				components: [
					{
						id: 10,
						required: true,
						qty: 10,
						stockAllocations: [{ qty: 6, status: "reserved" }],
						inboundDemands: [{ qty: 4, qtyReceived: 0, status: "ordered" }],
					},
				],
			},
		]);

		expect(plan.summary).toMatchObject({
			orderedQty: 10,
			allocatedQty: 6,
			inboundQty: 4,
			receivedQty: 0,
			backorderedQty: 4,
			status: "awaiting_inbound",
		});
		expect(plan.lines[0]?.status).toBe("awaiting_inbound");
		expect(plan.lines[0]?.components[0]?.backorderedQty).toBe(4);
	});

	test("moves a partially shipped sale to ready to ship remaining after inbound receipt covers the shortage", () => {
		const plan = summarizeSalesFulfillmentPlan([
			{
				id: 1,
				title: "Door package",
				qty: 10,
				salesItem: {
					id: 100,
					itemDeliveries: [
						{
							qty: 6,
							packingStatus: "packed",
							delivery: {
								status: "completed",
								deliveredAt: "2026-06-11T10:00:00.000Z",
							},
						},
					],
				},
				components: [
					{
						id: 10,
						required: true,
						qty: 10,
						stockAllocations: [{ qty: 6, status: "consumed" }],
						inboundDemands: [{ qty: 4, qtyReceived: 4, status: "received" }],
					},
				],
			},
		]);

		expect(plan.summary).toMatchObject({
			orderedQty: 10,
			shippedQty: 6,
			remainingQty: 4,
			backorderedQty: 0,
			receivedQty: 4,
			status: "ready_to_ship_remaining",
		});
		expect(plan.lines[0]?.status).toBe("ready_to_ship_remaining");
	});

	test("marks a fully completed shipment as fulfilled", () => {
		const plan = summarizeSalesFulfillmentPlan([
			{
				id: 1,
				qty: 2,
				salesItem: {
					id: 100,
					itemDeliveries: [
						{
							qty: 2,
							packingStatus: "packed",
							delivery: {
								status: "completed",
								deliveredAt: "2026-06-11T10:00:00.000Z",
							},
						},
					],
				},
				components: [
					{
						id: 10,
						required: true,
						qty: 2,
						stockAllocations: [{ qty: 2, status: "consumed" }],
					},
				],
			},
		]);

		expect(plan.summary.status).toBe("fulfilled");
		expect(plan.summary.shippedQty).toBe(2);
		expect(plan.summary.remainingQty).toBe(0);
	});
});
