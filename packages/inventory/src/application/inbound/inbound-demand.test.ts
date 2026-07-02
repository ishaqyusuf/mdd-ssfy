import { describe, expect, test } from "bun:test";

import {
	applyOrderInboundStatusToInventoryDemand,
	assignInboundDemandsToShipment,
	buildInboundStatusDemandReconciliation,
	createInboundShipmentFromDemands,
	planInboundReceiptDelta,
	releaseCancelledInboundShipmentDemand,
	receiveInboundShipment,
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

	test("caps new received quantity at the planned inbound quantity", () => {
		const plan = planInboundReceiptDelta({
			plannedQty: 10,
			previousGoodQty: 0,
			previousIssueQty: 0,
			qtyReceived: 12,
		});

		expect(plan).toEqual({
			targetGoodQty: 10,
			targetIssueQty: 0,
			targetReceivedQty: 10,
			deltaGoodQty: 10,
			deltaIssueQty: 0,
			deltaReceivedQty: 10,
			duplicate: false,
		});
	});

	test("does not let a new issue quantity push total received above plan", () => {
		const plan = planInboundReceiptDelta({
			plannedQty: 10,
			previousGoodQty: 8,
			previousIssueQty: 2,
			qtyIssue: 8,
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
});

describe("receiveInboundShipment", () => {
	test("preserves the original completed timestamp on duplicate receive", async () => {
		const receivedAt = new Date("2026-07-01T10:00:00.000Z");
		const shipmentUpdates: unknown[] = [];
		let itemUpdated = false;
		const result = await receiveInboundShipment(
			{
				inboundShipment: {
					findUniqueOrThrow: async () => ({
						id: 50,
						supplierId: 20,
						reference: "PO-50",
						receivedAt,
						items: [
							{
								id: 501,
								qty: 10,
								unitPrice: 12,
								qtyGood: 10,
								qtyIssue: 0,
								inventoryVariantId: 701,
								inventoryVariant: {
									inventoryId: 801,
								},
								issues: [],
								inboundDemands: [],
							},
						],
					}),
					updateMany: async (input: unknown) => {
						shipmentUpdates.push(input);
						return { count: 1 };
					},
				},
				inboundShipmentItem: {
					update: async () => {
						itemUpdated = true;
					},
				},
			} as any,
			{
				inboundId: 50,
				items: [
					{
						inboundShipmentItemId: 501,
						qtyReceived: 10,
					},
				],
			},
		);

		expect(result).toEqual({
			inboundId: 50,
			shipmentStatus: "completed",
			receivedItemCount: 0,
			stockMovementCount: 0,
			issueCount: 0,
			skippedItemCount: 1,
			newlyReceivedQty: 0,
			alreadyReceivedQty: 10,
			lineItemComponentIds: [],
			inventoryVariantIds: [701],
		});
		expect(shipmentUpdates).toEqual([
			{
				where: {
					id: 50,
					deletedAt: null,
					status: {
						notIn: ["closed", "cancelled"],
					},
				},
				data: {
					receivedAt,
					progress: 100,
					status: "completed",
				},
			},
		]);
		expect(itemUpdated).toBe(false);
	});

	test("keeps issue status open on duplicate issue receive", async () => {
		const shipmentUpdates: unknown[] = [];
		let issueCreated = false;
		let itemUpdated = false;
		const result = await receiveInboundShipment(
			{
				inboundShipment: {
					findUniqueOrThrow: async () => ({
						id: 51,
						supplierId: 21,
						reference: "PO-51",
						receivedAt: null,
						items: [
							{
								id: 502,
								qty: 10,
								unitPrice: 14,
								qtyGood: 8,
								qtyIssue: 2,
								inventoryVariantId: 702,
								inventoryVariant: {
									inventoryId: 802,
								},
								issues: [
									{
										id: 9001,
									},
								],
								inboundDemands: [],
							},
						],
					}),
					updateMany: async (input: unknown) => {
						shipmentUpdates.push(input);
						return { count: 1 };
					},
				},
				inboundShipmentItem: {
					update: async () => {
						itemUpdated = true;
					},
				},
				inboundShipmentItemIssue: {
					create: async () => {
						issueCreated = true;
					},
				},
			} as any,
			{
				inboundId: 51,
				items: [
					{
						inboundShipmentItemId: 502,
						qtyReceived: 10,
						qtyIssue: 2,
					},
				],
			},
		);

		expect(result.shipmentStatus).toBe("issue_open");
		expect(result.skippedItemCount).toBe(1);
		expect(result.issueCount).toBe(0);
		expect(issueCreated).toBe(false);
		expect(itemUpdated).toBe(false);
		expect(shipmentUpdates).toEqual([
			{
				where: {
					id: 51,
					deletedAt: null,
					status: {
						notIn: ["closed", "cancelled"],
					},
				},
				data: {
					receivedAt: null,
					progress: 100,
					status: "issue_open",
				},
			},
		]);
	});

	test("does not receive omitted items when an explicit item list is provided", async () => {
		const shipmentUpdates: unknown[] = [];
		let itemUpdated = false;
		const result = await receiveInboundShipment(
			{
				inboundShipment: {
					findUniqueOrThrow: async () => ({
						id: 52,
						supplierId: 22,
						reference: "PO-52",
						receivedAt: null,
						items: [
							{
								id: 503,
								qty: 10,
								unitPrice: 16,
								qtyGood: 0,
								qtyIssue: 0,
								inventoryVariantId: 703,
								inventoryVariant: {
									inventoryId: 803,
								},
								issues: [],
								inboundDemands: [],
							},
						],
					}),
					updateMany: async (input: unknown) => {
						shipmentUpdates.push(input);
						return { count: 1 };
					},
				},
				inboundShipmentItem: {
					update: async () => {
						itemUpdated = true;
					},
				},
			} as any,
			{
				inboundId: 52,
				items: [],
			},
		);

		expect(result).toEqual({
			inboundId: 52,
			shipmentStatus: "pending",
			receivedItemCount: 0,
			stockMovementCount: 0,
			issueCount: 0,
			skippedItemCount: 0,
			newlyReceivedQty: 0,
			alreadyReceivedQty: 0,
			lineItemComponentIds: [],
			inventoryVariantIds: [],
		});
		expect(itemUpdated).toBe(false);
		expect(shipmentUpdates).toEqual([
			{
				where: {
					id: 52,
					deletedAt: null,
					status: {
						notIn: ["closed", "cancelled"],
					},
				},
				data: {
					receivedAt: null,
					progress: 0,
					status: "pending",
				},
			},
		]);
	});

	test("does not write stock when guarded item receipt commit skips", async () => {
		const shipmentUpdates: unknown[] = [];
		let stockLookupCalled = false;
		let demandUpdated = false;
		let itemUpdated = false;
		const result = await receiveInboundShipment(
			{
				inboundShipment: {
					findUniqueOrThrow: async () => ({
						id: 55,
						supplierId: 25,
						reference: "PO-55",
						receivedAt: null,
						items: [
							{
								id: 505,
								qty: 10,
								unitPrice: 20,
								qtyGood: 0,
								qtyIssue: 0,
								inventoryVariantId: 705,
								inventoryVariant: {
									inventoryId: 805,
								},
								issues: [],
								inboundDemands: [
									{
										id: 9501,
										qty: 10,
										qtyReceived: 0,
										lineItemComponentId: 8501,
									},
								],
							},
						],
					}),
					updateMany: async (input: unknown) => {
						shipmentUpdates.push(input);
						return { count: 1 };
					},
				},
				inboundShipmentItem: {
					updateMany: async () => ({ count: 0 }),
					update: async () => {
						itemUpdated = true;
					},
				},
				inventoryStock: {
					findFirst: async () => {
						stockLookupCalled = true;
						return null;
					},
				},
				inboundDemand: {
					update: async () => {
						demandUpdated = true;
					},
				},
			} as any,
			{
				inboundId: 55,
				items: [
					{
						inboundShipmentItemId: 505,
						qtyReceived: 10,
					},
				],
			},
		);

		expect(result).toEqual({
			inboundId: 55,
			shipmentStatus: "pending",
			receivedItemCount: 0,
			stockMovementCount: 0,
			issueCount: 0,
			skippedItemCount: 1,
			newlyReceivedQty: 0,
			alreadyReceivedQty: 0,
			lineItemComponentIds: [],
			inventoryVariantIds: [],
		});
		expect(stockLookupCalled).toBe(false);
		expect(demandUpdated).toBe(false);
		expect(itemUpdated).toBe(false);
		expect(shipmentUpdates).toEqual([
			{
				where: {
					id: 55,
					deletedAt: null,
					status: {
						notIn: ["closed", "cancelled"],
					},
				},
				data: {
					receivedAt: null,
					progress: 0,
					status: "pending",
				},
			},
		]);
	});

	test("increments existing stock atomically when receiving good quantity", async () => {
		const receiptGuards: unknown[] = [];
		const stockLookups: unknown[] = [];
		const stockUpdates: unknown[] = [];
		const stockMovementCreates: unknown[] = [];
		const inventoryLogCreates: unknown[] = [];
		const shipmentUpdates: unknown[] = [];
		let itemUpdated = false;

		const result = await receiveInboundShipment(
			{
				inboundShipment: {
					findUniqueOrThrow: async () => ({
						id: 56,
						supplierId: 26,
						reference: "PO-56",
						receivedAt: null,
						items: [
							{
								id: 506,
								qty: 3,
								unitPrice: 22,
								qtyGood: 0,
								qtyIssue: 0,
								inventoryVariantId: 706,
								inventoryVariant: {
									inventoryId: 806,
								},
								issues: [],
								inboundDemands: [],
							},
						],
					}),
					updateMany: async (input: unknown) => {
						shipmentUpdates.push(input);
						return { count: 1 };
					},
				},
				inboundShipmentItem: {
					updateMany: async (input: unknown) => {
						receiptGuards.push(input);
						return { count: 1 };
					},
					update: async () => {
						itemUpdated = true;
					},
				},
				inventoryStock: {
					findFirst: async (input: unknown) => {
						stockLookups.push(input);
						return stockLookups.length === 1
							? {
									id: 300,
									qty: 4,
								}
							: {
									id: 300,
									qty: 7,
								};
					},
					updateMany: async (input: unknown) => {
						stockUpdates.push(input);
						return { count: 1 };
					},
					create: async () => {
						throw new Error("stock create should not be called");
					},
				},
				stockMovement: {
					create: async (input: unknown) => {
						stockMovementCreates.push(input);
					},
				},
				inventoryLog: {
					create: async (input: unknown) => {
						inventoryLogCreates.push(input);
					},
				},
			} as any,
			{
				inboundId: 56,
				items: [
					{
						inboundShipmentItemId: 506,
						qtyReceived: 3,
					},
				],
			},
		);

		expect(result).toEqual({
			inboundId: 56,
			shipmentStatus: "completed",
			receivedItemCount: 1,
			stockMovementCount: 1,
			issueCount: 0,
			skippedItemCount: 0,
			newlyReceivedQty: 3,
			alreadyReceivedQty: 0,
			lineItemComponentIds: [],
			inventoryVariantIds: [706],
		});
		expect(receiptGuards).toEqual([
			{
				where: {
					id: 506,
					deletedAt: null,
					qtyGood: 0,
					qtyIssue: 0,
				},
				data: {
					qtyGood: 3,
					qtyIssue: 0,
					unitPrice: 22,
				},
			},
		]);
		expect(stockLookups).toEqual([
			{
				where: {
					inventoryVariantId: 706,
					supplierId: 26,
					deletedAt: null,
				},
				select: {
					id: true,
					qty: true,
				},
				orderBy: {
					createdAt: "asc",
				},
			},
			{
				where: {
					id: 300,
					deletedAt: null,
				},
				select: {
					id: true,
					qty: true,
				},
			},
		]);
		expect(stockUpdates).toEqual([
			{
				where: {
					id: 300,
					inventoryVariantId: 706,
					supplierId: 26,
					deletedAt: null,
				},
				data: {
					qty: {
						increment: 3,
					},
					price: 22,
				},
			},
		]);
		expect(stockMovementCreates).toEqual([
			{
				data: {
					inventoryVariantId: 706,
					prevQty: 4,
					currentQty: 7,
					changeQty: 3,
					type: "stock_in",
					status: "completed",
					reference: "PO-56",
					notes: "Inbound receipt for shipment #56",
					authorName: null,
					inboundStockItemId: 506,
				},
			},
		]);
		expect(inventoryLogCreates).toEqual([
			{
				data: {
					action: "inbound-received",
					qty: 3,
					costPrice: 22,
					inventoryVariantId: 706,
					inventoryId: 806,
					inventoryStockId: 300,
					createdBy: null,
					notes: "Inbound shipment #56 received",
				},
			},
		]);
		expect(shipmentUpdates).toEqual([
			{
				where: {
					id: 56,
					deletedAt: null,
					status: {
						notIn: ["closed", "cancelled"],
					},
				},
				data: {
					receivedAt: expect.any(Date),
					progress: 100,
					status: "completed",
				},
			},
		]);
		expect(itemUpdated).toBe(false);
	});

	test("rejects receive when existing stock row changes before stock increment commits", async () => {
		const receiptGuards: unknown[] = [];
		const stockUpdates: unknown[] = [];
		let stockMovementCreated = false;
		let inventoryLogCreated = false;

		await expect(
			receiveInboundShipment(
				{
					inboundShipment: {
						findUniqueOrThrow: async () => ({
							id: 59,
							supplierId: 29,
							reference: "PO-59",
							receivedAt: null,
							status: "pending",
							deletedAt: null,
							items: [
								{
									id: 509,
									qty: 3,
									unitPrice: 22,
									qtyGood: 0,
									qtyIssue: 0,
									inventoryVariantId: 709,
									inventoryVariant: {
										inventoryId: 809,
									},
									issues: [],
									inboundDemands: [],
								},
							],
						}),
					},
					inboundShipmentItem: {
						updateMany: async (input: unknown) => {
							receiptGuards.push(input);
							return { count: 1 };
						},
					},
					inventoryStock: {
						findFirst: async () => ({
							id: 301,
							qty: 4,
						}),
						updateMany: async (input: unknown) => {
							stockUpdates.push(input);
							return { count: 0 };
						},
						create: async () => {
							throw new Error("stock create should not be called");
						},
					},
					stockMovement: {
						create: async () => {
							stockMovementCreated = true;
						},
					},
					inventoryLog: {
						create: async () => {
							inventoryLogCreated = true;
						},
					},
				} as any,
				{
					inboundId: 59,
					items: [
						{
							inboundShipmentItemId: 509,
							qtyReceived: 3,
						},
					],
				},
			),
		).rejects.toThrow(
			"Inventory stock #301 changed before inbound receipt could be committed.",
		);

		expect(receiptGuards).toEqual([
			{
				where: {
					id: 509,
					deletedAt: null,
					qtyGood: 0,
					qtyIssue: 0,
				},
				data: {
					qtyGood: 3,
					qtyIssue: 0,
					unitPrice: 22,
				},
			},
		]);
		expect(stockUpdates).toEqual([
			{
				where: {
					id: 301,
					inventoryVariantId: 709,
					supplierId: 29,
					deletedAt: null,
				},
				data: {
					qty: {
						increment: 3,
					},
					price: 22,
				},
			},
		]);
		expect(stockMovementCreated).toBe(false);
		expect(inventoryLogCreated).toBe(false);
	});

	test("uses guarded demand receipt updates and keeps skipped demand quantity available", async () => {
		const demandUpdates: unknown[] = [];
		const componentLookups: unknown[] = [];
		const componentUpdates: unknown[] = [];
		const shipmentUpdates: unknown[] = [];

		const result = await receiveInboundShipment(
			{
				inboundShipment: {
					findUniqueOrThrow: async () => ({
						id: 57,
						supplierId: 27,
						reference: "PO-57",
						receivedAt: null,
						items: [
							{
								id: 507,
								qty: 2,
								unitPrice: 24,
								qtyGood: 0,
								qtyIssue: 0,
								inventoryVariantId: 707,
								inventoryVariant: {
									inventoryId: 807,
								},
								issues: [],
								inboundDemands: [
									{
										id: 9601,
										qty: 2,
										qtyReceived: 0,
										lineItemComponentId: 8501,
									},
									{
										id: 9602,
										qty: 2,
										qtyReceived: 0,
										lineItemComponentId: 8502,
									},
								],
							},
						],
					}),
					updateMany: async (input: unknown) => {
						shipmentUpdates.push(input);
						return { count: 1 };
					},
				},
				inboundShipmentItem: {
					updateMany: async () => ({ count: 1 }),
					update: async () => {
						throw new Error("item update fallback should not be called");
					},
				},
				inventoryStock: {
					findFirst: async () => null,
					create: async () => ({ id: 301, qty: 2 }),
				},
				stockMovement: {
					create: async () => undefined,
				},
				inventoryLog: {
					create: async () => undefined,
				},
				inboundDemand: {
					updateMany: async (input: unknown) => {
						demandUpdates.push(input);
						const id = (input as { where?: { id?: number } }).where?.id;
						return { count: id === 9601 ? 0 : 1 };
					},
				},
				lineItemComponents: {
					findFirst: async (input: unknown) => {
						componentLookups.push(input);
						return {
							id: 8502,
							qty: 2,
							stockAllocations: [],
							inboundDemands: [
								{
									qty: 2,
									qtyReceived: 2,
								},
							],
						};
					},
					updateMany: async (input: unknown) => {
						componentUpdates.push(input);
						return { count: 1 };
					},
				},
			} as any,
			{
				inboundId: 57,
				items: [
					{
						inboundShipmentItemId: 507,
						qtyReceived: 2,
					},
				],
			},
		);

		expect(result).toEqual({
			inboundId: 57,
			shipmentStatus: "completed",
			receivedItemCount: 1,
			stockMovementCount: 1,
			issueCount: 0,
			skippedItemCount: 0,
			newlyReceivedQty: 2,
			alreadyReceivedQty: 0,
			lineItemComponentIds: [8502],
			inventoryVariantIds: [707],
		});
		expect(demandUpdates).toEqual([
			{
				where: {
					id: 9601,
					deletedAt: null,
					qtyReceived: 0,
					status: {
						in: ["pending", "ordered", "partially_received"],
					},
				},
				data: {
					qtyReceived: 2,
					status: "received",
				},
			},
			{
				where: {
					id: 9602,
					deletedAt: null,
					qtyReceived: 0,
					status: {
						in: ["pending", "ordered", "partially_received"],
					},
				},
				data: {
					qtyReceived: 2,
					status: "received",
				},
			},
		]);
		expect(componentLookups).toEqual([
			{
				where: {
					id: 8502,
					deletedAt: null,
				},
				select: {
					id: true,
					qty: true,
					stockAllocations: {
						where: {
							deletedAt: null,
							status: {
								in: ["approved", "reserved", "picked", "consumed"],
							},
						},
						select: {
							qty: true,
						},
					},
					inboundDemands: {
						where: {
							deletedAt: null,
							status: {
								not: "cancelled",
							},
						},
						select: {
							qty: true,
							qtyReceived: true,
						},
					},
				},
			},
		]);
		expect(componentUpdates).toEqual([
			{
				where: {
					id: 8502,
					deletedAt: null,
				},
				data: {
					qtyAllocated: 0,
					qtyInbound: 2,
					qtyReceived: 2,
					status: "fulfilled",
				},
			},
		]);
		expect(shipmentUpdates).toEqual([
			{
				where: {
					id: 57,
					deletedAt: null,
					status: {
						notIn: ["closed", "cancelled"],
					},
				},
				data: {
					receivedAt: expect.any(Date),
					progress: 100,
					status: "completed",
				},
			},
		]);
	});

	test("rejects terminal inbound shipments before receipt writes", async () => {
		let itemUpdated = false;
		let shipmentUpdated = false;

		await expect(
			receiveInboundShipment(
				{
					inboundShipment: {
						findUniqueOrThrow: async () => ({
							id: 58,
							supplierId: 28,
							reference: "PO-58",
							receivedAt: null,
							status: "cancelled",
							deletedAt: null,
							items: [
								{
									id: 508,
									qty: 1,
									unitPrice: 26,
									qtyGood: 0,
									qtyIssue: 0,
									inventoryVariantId: 708,
									inventoryVariant: {
										inventoryId: 808,
									},
									issues: [],
									inboundDemands: [],
								},
							],
						}),
						updateMany: async () => {
							shipmentUpdated = true;
							return { count: 1 };
						},
					},
					inboundShipmentItem: {
						updateMany: async () => {
							itemUpdated = true;
							return { count: 1 };
						},
					},
				} as any,
				{
					inboundId: 58,
					items: [
						{
							inboundShipmentItemId: 508,
							qtyReceived: 1,
						},
					],
				},
			),
		).rejects.toThrow(
			"Inbound shipment #58 is not receivable in cancelled status.",
		);

		expect(itemUpdated).toBe(false);
		expect(shipmentUpdated).toBe(false);
	});

	test("rejects when shipment status becomes terminal before status commit", async () => {
		const shipmentUpdates: unknown[] = [];

		await expect(
			receiveInboundShipment(
				{
					inboundShipment: {
						findUniqueOrThrow: async () => ({
							id: 59,
							supplierId: 29,
							reference: "PO-59",
							receivedAt: null,
							status: "pending",
							deletedAt: null,
							items: [
								{
									id: 509,
									qty: 1,
									unitPrice: 28,
									qtyGood: 0,
									qtyIssue: 0,
									inventoryVariantId: 709,
									inventoryVariant: {
										inventoryId: 809,
									},
									issues: [],
									inboundDemands: [],
								},
							],
						}),
						updateMany: async (input: unknown) => {
							shipmentUpdates.push(input);
							return { count: 0 };
						},
					},
				} as any,
				{
					inboundId: 59,
					items: [],
				},
			),
		).rejects.toThrow("Inbound shipment #59 is no longer receivable.");

		expect(shipmentUpdates).toEqual([
			{
				where: {
					id: 59,
					deletedAt: null,
					status: {
						notIn: ["closed", "cancelled"],
					},
				},
				data: {
					receivedAt: null,
					progress: 0,
					status: "pending",
				},
			},
		]);
	});

	test("rejects explicit receive items that are not on the shipment", async () => {
		let shipmentUpdated = false;

		await expect(
			receiveInboundShipment(
				{
					inboundShipment: {
						findUniqueOrThrow: async () => ({
							id: 53,
							supplierId: 23,
							reference: "PO-53",
							receivedAt: null,
							items: [],
						}),
						update: async () => {
							shipmentUpdated = true;
						},
					},
				} as any,
				{
					inboundId: 53,
					items: [
						{
							inboundShipmentItemId: 999,
							qtyReceived: 1,
						},
					],
				},
			),
		).rejects.toThrow(
			"Inbound shipment item 999 was not found on shipment #53.",
		);

		expect(shipmentUpdated).toBe(false);
	});

	test("rejects duplicate explicit receive item ids", async () => {
		let shipmentUpdated = false;

		await expect(
			receiveInboundShipment(
				{
					inboundShipment: {
						findUniqueOrThrow: async () => ({
							id: 54,
							supplierId: 24,
							reference: "PO-54",
							receivedAt: null,
							items: [
								{
									id: 504,
									qty: 10,
									unitPrice: 18,
									qtyGood: 0,
									qtyIssue: 0,
									inventoryVariantId: 704,
									inventoryVariant: {
										inventoryId: 804,
									},
									issues: [],
									inboundDemands: [],
								},
							],
						}),
						update: async () => {
							shipmentUpdated = true;
						},
					},
				} as any,
				{
					inboundId: 54,
					items: [
						{
							inboundShipmentItemId: 504,
							qtyReceived: 1,
						},
						{
							inboundShipmentItemId: 504,
							qtyReceived: 2,
						},
					],
				},
			),
		).rejects.toThrow(
			"Inbound shipment item 504 was provided more than once.",
		);

		expect(shipmentUpdated).toBe(false);
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
	test("maps ordered prompts onto unassigned mutable demand rows", async () => {
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
					qtyReceived: 0,
					inboundShipmentItemId: null,
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
		const findManyCalls: unknown[] = [];
		const updateManyCalls: unknown[] = [];
		const componentLookupIds: number[] = [];
		const componentUpdateCalls: unknown[] = [];
		const result = await applyOrderInboundStatusToInventoryDemand(
			{
				inboundDemand: {
					findMany: async (input: unknown) => {
						findManyCalls.push(input);
						return [
							{
								id: 701,
								lineItemComponentId: 901,
							},
							{
								id: 703,
								lineItemComponentId: 902,
							},
						];
					},
					updateMany: async (input: unknown) => {
						updateManyCalls.push(input);
						return { count: 1 };
					},
				},
				lineItemComponents: {
					findFirst: async (input: { where: { id: number } }) => {
						componentLookupIds.push(input.where.id);
						return {
							id: input.where.id,
							qty: 5,
							stockAllocations: [],
							inboundDemands: [],
						};
					},
					updateMany: async (input: unknown) => {
						componentUpdateCalls.push(input);
						return { count: 1 };
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
			recomputedComponentCount: 2,
			skipped: false,
		});
		expect(findManyCalls).toEqual([
			{
				where: {
					deletedAt: null,
					status: {
						in: ["pending", "ordered"],
					},
					id: {
						in: [701, 703],
					},
					qtyReceived: 0,
					inboundShipmentItemId: null,
					lineItemComponent: {
						parent: {
							saleId: 9004,
							deletedAt: null,
						},
					},
				},
				orderBy: {
					createdAt: "asc",
				},
				select: {
					id: true,
					lineItemComponentId: true,
				},
			},
		]);
		expect(updateManyCalls).toEqual([
			{
				where: {
					deletedAt: null,
					status: {
						in: ["pending", "ordered"],
					},
					id: 701,
					qtyReceived: 0,
					inboundShipmentItemId: null,
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
			{
				where: {
					deletedAt: null,
					status: {
						in: ["pending", "ordered"],
					},
					id: 703,
					qtyReceived: 0,
					inboundShipmentItemId: null,
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
		expect(componentLookupIds).toEqual([901, 902]);
		expect(componentUpdateCalls).toEqual([
			{
				where: {
					id: 901,
					deletedAt: null,
				},
				data: {
					qtyAllocated: 0,
					qtyInbound: 0,
					qtyReceived: 0,
					status: "pending",
				},
			},
			{
				where: {
					id: 902,
					deletedAt: null,
				},
				data: {
					qtyAllocated: 0,
					qtyInbound: 0,
					qtyReceived: 0,
					status: "pending",
				},
			},
		]);
	});

	test("recomputes only components confirmed cancelled by a selected available prompt", async () => {
		const updateManyCalls: unknown[] = [];
		const componentLookupIds: number[] = [];
		const result = await applyOrderInboundStatusToInventoryDemand(
			{
				inboundDemand: {
					findMany: async () => [
						{
							id: 704,
							lineItemComponentId: 903,
						},
						{
							id: 705,
							lineItemComponentId: 904,
						},
					],
					updateMany: async (input: unknown) => {
						updateManyCalls.push(input);
						const id = (input as { where?: { id?: number } }).where?.id;
						return { count: id === 704 ? 1 : 0 };
					},
				},
				lineItemComponents: {
					findFirst: async (input: { where: { id: number } }) => {
						componentLookupIds.push(input.where.id);
						return {
							id: input.where.id,
							qty: 5,
							stockAllocations: [],
							inboundDemands: [],
						};
					},
					updateMany: async () => ({ count: 1 }),
				},
			} as any,
			{
				saleId: 9008,
				status: "AVAILABLE",
				demandIds: [704, 705],
			},
		);

		expect(result).toEqual({
			saleId: 9008,
			status: "AVAILABLE",
			updatedDemandCount: 1,
			recomputedComponentCount: 1,
			skipped: false,
		});
		expect(updateManyCalls).toHaveLength(2);
		expect(componentLookupIds).toEqual([903]);
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
					qtyReceived: 0,
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
					qtyReceived: 0,
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

describe("assignInboundDemandsToShipment", () => {
	test("increments an existing inbound item only by confirmed linked demand quantity", async () => {
		const itemUpdates: unknown[] = [];
		const demandUpdates: unknown[] = [];
		const result = await assignInboundDemandsToShipment(
			{
				inboundShipment: {
					findUniqueOrThrow: async () => ({ id: 44 }),
				},
				inboundDemand: {
					findMany: async () => [
						{
							id: 811,
							qty: 3,
							qtyReceived: 0,
							inboundShipmentItemId: null,
							inventoryVariantId: 911,
						},
						{
							id: 812,
							qty: 9,
							qtyReceived: 0,
							inboundShipmentItemId: 701,
							inventoryVariantId: 911,
						},
					],
					updateMany: async (input: unknown) => {
						demandUpdates.push(input);
						return { count: 1 };
					},
				},
				inboundShipmentItem: {
					findMany: async () => [
						{
							id: 701,
							inventoryVariantId: 911,
							qty: 4,
						},
					],
					updateMany: async (input: unknown) => {
						itemUpdates.push(input);
						return { count: 1 };
					},
					create: async () => {
						throw new Error("create should not be called");
					},
				},
			} as any,
			{
				inboundId: 44,
				demandIds: [811, 812],
			},
		);

		expect(result).toEqual({
			inboundId: 44,
			linkedDemandCount: 1,
			linkedDemandIds: [811],
		});
		expect(itemUpdates).toEqual([
			{
				where: {
					id: 701,
					inboundId: 44,
					deletedAt: null,
					inbound: {
						deletedAt: null,
						status: {
							notIn: ["closed", "cancelled"],
						},
					},
				},
				data: {
					qty: {
						increment: 3,
					},
				},
			},
		]);
		expect(demandUpdates).toEqual([
			{
				where: {
					id: 811,
					deletedAt: null,
					status: {
						in: ["pending", "ordered", "partially_received"],
					},
					qtyReceived: 0,
					inboundShipmentItemId: null,
				},
				data: {
					inboundShipmentItemId: 701,
					status: "ordered",
				},
			},
		]);
	});

	test("does not mutate an inbound shipment when every demand row is already linked", async () => {
		let itemLookupCalled = false;

		await expect(
			assignInboundDemandsToShipment(
				{
					inboundShipment: {
						findUniqueOrThrow: async () => ({ id: 45 }),
					},
					inboundDemand: {
						findMany: async () => [
							{
								id: 813,
								qty: 6,
								qtyReceived: 0,
								inboundShipmentItemId: 702,
								inventoryVariantId: 912,
							},
						],
					},
					inboundShipmentItem: {
						findMany: async () => {
							itemLookupCalled = true;
							return [];
						},
					},
				} as any,
				{
					inboundId: 45,
					demandIds: [813],
				},
			),
		).rejects.toThrow("No unassigned inbound demand rows were found.");

		expect(itemLookupCalled).toBe(false);
	});

	test("rejects terminal inbound shipments before assigning demand", async () => {
		let demandLookupCalled = false;

		await expect(
			assignInboundDemandsToShipment(
				{
					inboundShipment: {
						findUniqueOrThrow: async () => ({
							id: 48,
							status: "cancelled",
							deletedAt: null,
						}),
					},
					inboundDemand: {
						findMany: async () => {
							demandLookupCalled = true;
							return [];
						},
					},
				} as any,
				{
					inboundId: 48,
					demandIds: [816],
				},
			),
		).rejects.toThrow(
			"Inbound shipment #48 is not assignable in cancelled status.",
		);

		expect(demandLookupCalled).toBe(false);
	});

	test("rejects assignment when inbound becomes terminal before item quantity commit", async () => {
		const itemUpdates: unknown[] = [];
		const demandUpdates: unknown[] = [];

		await expect(
			assignInboundDemandsToShipment(
				{
					inboundShipment: {
						findUniqueOrThrow: async () => ({
							id: 49,
							status: "pending",
							deletedAt: null,
						}),
					},
					inboundDemand: {
						findMany: async () => [
							{
								id: 817,
								qty: 5,
								qtyReceived: 0,
								inboundShipmentItemId: null,
								inventoryVariantId: 915,
							},
						],
						updateMany: async (input: unknown) => {
							demandUpdates.push(input);
							return { count: 1 };
						},
					},
					inboundShipmentItem: {
						findMany: async () => [
							{
								id: 705,
								inventoryVariantId: 915,
								qty: 2,
							},
						],
						updateMany: async (input: unknown) => {
							itemUpdates.push(input);
							return { count: 0 };
						},
					},
				} as any,
				{
					inboundId: 49,
					demandIds: [817],
				},
			),
		).rejects.toThrow(
			"Inbound shipment #49 changed before demand assignment could be committed.",
		);

		expect(demandUpdates).toEqual([
			{
				where: {
					id: 817,
					deletedAt: null,
					status: {
						in: ["pending", "ordered", "partially_received"],
					},
					qtyReceived: 0,
					inboundShipmentItemId: null,
				},
				data: {
					inboundShipmentItemId: 705,
					status: "ordered",
				},
			},
		]);
		expect(itemUpdates).toEqual([
			{
				where: {
					id: 705,
					inboundId: 49,
					deletedAt: null,
					inbound: {
						deletedAt: null,
						status: {
							notIn: ["closed", "cancelled"],
						},
					},
				},
				data: {
					qty: {
						increment: 5,
					},
				},
			},
		]);
	});

	test("does not inflate an existing inbound item when guarded linking skips every demand", async () => {
		let itemUpdated = false;

		await expect(
			assignInboundDemandsToShipment(
				{
					inboundShipment: {
						findUniqueOrThrow: async () => ({ id: 46 }),
					},
					inboundDemand: {
						findMany: async () => [
							{
								id: 814,
								qty: 4,
								qtyReceived: 0,
								inboundShipmentItemId: null,
								inventoryVariantId: 913,
							},
						],
						updateMany: async () => ({ count: 0 }),
					},
					inboundShipmentItem: {
						findMany: async () => [
							{
								id: 703,
								inventoryVariantId: 913,
								qty: 8,
							},
						],
						update: async () => {
							itemUpdated = true;
							return { id: 703 };
						},
					},
				} as any,
				{
					inboundId: 46,
					demandIds: [814],
				},
			),
		).rejects.toThrow("No unassigned inbound demand rows were linked.");

		expect(itemUpdated).toBe(false);
	});

	test("soft-deletes an empty new inbound item when guarded linking skips every demand", async () => {
		const itemUpdates: unknown[] = [];

		await expect(
			assignInboundDemandsToShipment(
				{
					inboundShipment: {
						findUniqueOrThrow: async () => ({ id: 47 }),
					},
					inboundDemand: {
						findMany: async () => [
							{
								id: 815,
								qty: 4,
								qtyReceived: 0,
								inboundShipmentItemId: null,
								inventoryVariantId: 914,
							},
						],
						updateMany: async () => ({ count: 0 }),
					},
					inboundShipmentItem: {
						findMany: async () => [],
						create: async () => ({ id: 704 }),
						updateMany: async (input: unknown) => {
							itemUpdates.push(input);
							return { count: 1 };
						},
					},
				} as any,
				{
					inboundId: 47,
					demandIds: [815],
				},
			),
		).rejects.toThrow("No unassigned inbound demand rows were linked.");

		expect(itemUpdates).toEqual([
			{
				where: {
					id: 704,
					inboundId: 47,
					deletedAt: null,
					inbound: {
						deletedAt: null,
						status: {
							notIn: ["closed", "cancelled"],
						},
					},
				},
				data: {
					deletedAt: expect.any(Date),
				},
			},
		]);
	});

	test("rejects empty item cleanup when inbound becomes terminal during assignment", async () => {
		const itemUpdates: unknown[] = [];

		await expect(
			assignInboundDemandsToShipment(
				{
					inboundShipment: {
						findUniqueOrThrow: async () => ({
							id: 48,
							status: "pending",
							deletedAt: null,
						}),
					},
					inboundDemand: {
						findMany: async () => [
							{
								id: 816,
								qty: 4,
								qtyReceived: 0,
								inboundShipmentItemId: null,
								inventoryVariantId: 914,
							},
						],
						updateMany: async () => ({ count: 0 }),
					},
					inboundShipmentItem: {
						findMany: async () => [],
						create: async () => ({ id: 706 }),
						updateMany: async (input: unknown) => {
							itemUpdates.push(input);
							return { count: 0 };
						},
					},
				} as any,
				{
					inboundId: 48,
					demandIds: [816],
				},
			),
		).rejects.toThrow(
			"Inbound shipment #48 changed before empty item cleanup could be committed.",
		);

		expect(itemUpdates).toEqual([
			{
				where: {
					id: 706,
					inboundId: 48,
					deletedAt: null,
					inbound: {
						deletedAt: null,
						status: {
							notIn: ["closed", "cancelled"],
						},
					},
				},
				data: {
					deletedAt: expect.any(Date),
				},
			},
		]);
	});
});

describe("createInboundShipmentFromDemands", () => {
	test("plans new shipment items only from unlinked active demand", async () => {
		const shipmentCreates: unknown[] = [];
		const itemCreates: unknown[] = [];
		const itemUpdates: unknown[] = [];
		const demandUpdates: unknown[] = [];
		const result = await createInboundShipmentFromDemands(
			{
				inboundDemand: {
					findMany: async () => [
						{
							id: 801,
							qty: 2,
							qtyReceived: 0,
							inboundShipmentItemId: null,
							inventoryVariantId: 901,
						},
						{
							id: 802,
							qty: 5,
							qtyReceived: 0,
							inboundShipmentItemId: 7001,
							inventoryVariantId: 901,
						},
					],
					updateMany: async (input: unknown) => {
						demandUpdates.push(input);
						return { count: 1 };
					},
				},
				inboundShipment: {
					create: async (input: unknown) => {
						shipmentCreates.push(input);
						return { id: 501 };
					},
				},
				inboundShipmentItem: {
					create: async (input: unknown) => {
						itemCreates.push(input);
						return { id: 601 };
					},
					updateMany: async (input: unknown) => {
						itemUpdates.push(input);
						return { count: 1 };
					},
				},
			} as any,
			{
				supplierId: 301,
				demandIds: [801, 802],
				reference: "PO-1",
			},
		);

		expect(result).toEqual({
			inboundId: 501,
			createdItemCount: 1,
			linkedDemandCount: 1,
			linkedDemandIds: [801],
		});
		expect(shipmentCreates).toEqual([
			{
				data: {
					supplierId: 301,
					reference: "PO-1",
					expectedAt: null,
					status: "pending",
					progress: 0,
				},
				select: {
					id: true,
				},
			},
		]);
		expect(itemCreates).toEqual([
			{
				data: {
					inboundId: 501,
					inventoryVariantId: 901,
					qty: 0,
				},
				select: {
					id: true,
				},
			},
		]);
		expect(itemUpdates).toEqual([
			{
				where: {
					id: 601,
					inboundId: 501,
					deletedAt: null,
					inbound: {
						deletedAt: null,
						status: {
							notIn: ["closed", "cancelled"],
						},
					},
				},
				data: {
					qty: 2,
				},
			},
		]);
		expect(demandUpdates).toEqual([
			{
				where: {
					id: 801,
					deletedAt: null,
					status: {
						in: ["pending", "ordered", "partially_received"],
					},
					qtyReceived: 0,
					inboundShipmentItemId: null,
				},
				data: {
					inboundShipmentItemId: 601,
					status: "ordered",
				},
			},
		]);
	});

	test("does not create a new inbound shipment when every demand row is already linked", async () => {
		let shipmentCreated = false;

		await expect(
			createInboundShipmentFromDemands(
				{
					inboundDemand: {
						findMany: async () => [
							{
								id: 803,
								qty: 5,
								qtyReceived: 0,
								inboundShipmentItemId: 7002,
								inventoryVariantId: 902,
							},
						],
					},
					inboundShipment: {
						create: async () => {
							shipmentCreated = true;
							return { id: 502 };
						},
					},
					inboundShipmentItem: {
						create: async () => ({ id: 602 }),
					},
				} as any,
				{
					supplierId: 302,
					demandIds: [803],
				},
			),
		).rejects.toThrow("No unassigned inbound demand rows were found.");

		expect(shipmentCreated).toBe(false);
	});

	test("rejects new inbound creation when item quantity commit loses active inbound guard", async () => {
		const itemUpdates: unknown[] = [];
		const demandUpdates: unknown[] = [];

		await expect(
			createInboundShipmentFromDemands(
				{
					inboundDemand: {
						findMany: async () => [
							{
								id: 805,
								qty: 6,
								qtyReceived: 0,
								inboundShipmentItemId: null,
								inventoryVariantId: 904,
							},
						],
						updateMany: async (input: unknown) => {
							demandUpdates.push(input);
							return { count: 1 };
						},
					},
					inboundShipment: {
						create: async () => ({ id: 504 }),
					},
					inboundShipmentItem: {
						create: async () => ({ id: 604 }),
						updateMany: async (input: unknown) => {
							itemUpdates.push(input);
							return { count: 0 };
						},
					},
				} as any,
				{
					supplierId: 304,
					demandIds: [805],
				},
			),
		).rejects.toThrow(
			"Inbound shipment #504 changed before demand assignment could be committed.",
		);

		expect(demandUpdates).toEqual([
			{
				where: {
					id: 805,
					deletedAt: null,
					status: {
						in: ["pending", "ordered", "partially_received"],
					},
					qtyReceived: 0,
					inboundShipmentItemId: null,
				},
				data: {
					inboundShipmentItemId: 604,
					status: "ordered",
				},
			},
		]);
		expect(itemUpdates).toEqual([
			{
				where: {
					id: 604,
					inboundId: 504,
					deletedAt: null,
					inbound: {
						deletedAt: null,
						status: {
							notIn: ["closed", "cancelled"],
						},
					},
				},
				data: {
					qty: 6,
				},
			},
		]);
	});

	test("soft-deletes an empty new inbound when guarded linking skips every demand", async () => {
		const itemUpdates: unknown[] = [];
		const shipmentUpdates: unknown[] = [];

		await expect(
			createInboundShipmentFromDemands(
				{
					inboundDemand: {
						findMany: async () => [
							{
								id: 804,
								qty: 4,
								qtyReceived: 0,
								inboundShipmentItemId: null,
								inventoryVariantId: 903,
							},
						],
						updateMany: async () => ({ count: 0 }),
					},
					inboundShipment: {
						create: async () => ({ id: 503 }),
						updateMany: async (input: unknown) => {
							shipmentUpdates.push(input);
							return { count: 1 };
						},
					},
					inboundShipmentItem: {
						create: async () => ({ id: 603 }),
						updateMany: async (input: unknown) => {
							itemUpdates.push(input);
							return { count: 1 };
						},
					},
				} as any,
				{
					supplierId: 303,
					demandIds: [804],
				},
			),
		).rejects.toThrow("No unassigned inbound demand rows were linked.");

		expect(itemUpdates).toEqual([
			{
				where: {
					id: 603,
					inboundId: 503,
					deletedAt: null,
					inbound: {
						deletedAt: null,
						status: {
							notIn: ["closed", "cancelled"],
						},
					},
				},
				data: {
					deletedAt: expect.any(Date),
				},
			},
		]);
		expect(shipmentUpdates).toEqual([
			{
				where: {
					id: 503,
					deletedAt: null,
					status: {
						notIn: ["closed", "cancelled"],
					},
				},
				data: {
					deletedAt: expect.any(Date),
				},
			},
		]);
	});

	test("rejects empty shipment cleanup when newly-created inbound becomes terminal", async () => {
		const itemUpdates: unknown[] = [];
		const shipmentUpdates: unknown[] = [];

		await expect(
			createInboundShipmentFromDemands(
				{
					inboundDemand: {
						findMany: async () => [
							{
								id: 806,
								qty: 4,
								qtyReceived: 0,
								inboundShipmentItemId: null,
								inventoryVariantId: 905,
							},
						],
						updateMany: async () => ({ count: 0 }),
					},
					inboundShipment: {
						create: async () => ({ id: 505 }),
						updateMany: async (input: unknown) => {
							shipmentUpdates.push(input);
							return { count: 0 };
						},
					},
					inboundShipmentItem: {
						create: async () => ({ id: 605 }),
						updateMany: async (input: unknown) => {
							itemUpdates.push(input);
							return { count: 1 };
						},
					},
				} as any,
				{
					supplierId: 305,
					demandIds: [806],
				},
			),
		).rejects.toThrow(
			"Inbound shipment #505 changed before empty shipment cleanup could be committed.",
		);

		expect(itemUpdates).toEqual([
			{
				where: {
					id: 605,
					inboundId: 505,
					deletedAt: null,
					inbound: {
						deletedAt: null,
						status: {
							notIn: ["closed", "cancelled"],
						},
					},
				},
				data: {
					deletedAt: expect.any(Date),
				},
			},
		]);
		expect(shipmentUpdates).toEqual([
			{
				where: {
					id: 505,
					deletedAt: null,
					status: {
						notIn: ["closed", "cancelled"],
					},
				},
				data: {
					deletedAt: expect.any(Date),
				},
			},
		]);
	});
});

describe("releaseCancelledInboundShipmentDemand", () => {
	test("releases unreceived active demand and recomputes touched components", async () => {
		const findManyCalls: unknown[] = [];
		const updateManyCalls: unknown[] = [];
		const componentUpdateCalls: unknown[] = [];
		const result = await releaseCancelledInboundShipmentDemand(
			{
				inboundDemand: {
					findMany: async (input: unknown) => {
						findManyCalls.push(input);
						return [
							{
								id: 701,
								lineItemComponentId: 401,
							},
							{
								id: 702,
								lineItemComponentId: 401,
							},
						];
					},
					updateMany: async (input: unknown) => {
						updateManyCalls.push(input);
						return { count: 1 };
					},
				},
				lineItemComponents: {
					findFirst: async () => ({
						id: 401,
						qty: 5,
						stockAllocations: [],
						inboundDemands: [],
					}),
					updateMany: async (input: unknown) => {
						componentUpdateCalls.push(input);
						return { count: 1 };
					},
				},
			} as any,
			44,
		);

		expect(result).toEqual({
			inboundId: 44,
			releasedDemandCount: 2,
			recomputedComponentCount: 1,
		});
		expect(findManyCalls).toEqual([
			{
				where: {
					deletedAt: null,
					qtyReceived: 0,
					status: {
						in: ["pending", "ordered", "partially_received"],
					},
					inboundShipmentItem: {
						inboundId: 44,
						deletedAt: null,
						inbound: {
							status: "cancelled",
							deletedAt: null,
						},
					},
				},
				select: {
					id: true,
					lineItemComponentId: true,
				},
			},
		]);
		expect(updateManyCalls).toEqual([
			{
				where: {
					id: 701,
					deletedAt: null,
					qtyReceived: 0,
					status: {
						in: ["pending", "ordered", "partially_received"],
					},
					inboundShipmentItem: {
						inboundId: 44,
						deletedAt: null,
						inbound: {
							status: "cancelled",
							deletedAt: null,
						},
					},
				},
				data: {
					inboundShipmentItemId: null,
					status: "pending",
					notes: "Released from cancelled inbound shipment #44",
				},
			},
			{
				where: {
					id: 702,
					deletedAt: null,
					qtyReceived: 0,
					status: {
						in: ["pending", "ordered", "partially_received"],
					},
					inboundShipmentItem: {
						inboundId: 44,
						deletedAt: null,
						inbound: {
							status: "cancelled",
							deletedAt: null,
						},
					},
				},
				data: {
					inboundShipmentItemId: null,
					status: "pending",
					notes: "Released from cancelled inbound shipment #44",
				},
			},
		]);
		expect(componentUpdateCalls).toEqual([
			{
				where: {
					id: 401,
					deletedAt: null,
				},
				data: {
					qtyAllocated: 0,
					qtyInbound: 0,
					qtyReceived: 0,
					status: "pending",
				},
			},
		]);
	});

	test("does not release demand unless the parent inbound is cancelled", async () => {
		const findManyCalls: unknown[] = [];
		let updateCalled = false;
		const result = await releaseCancelledInboundShipmentDemand(
			{
				inboundDemand: {
					findMany: async (input: unknown) => {
						findManyCalls.push(input);
						return [];
					},
					updateMany: async () => {
						updateCalled = true;
						return { count: 0 };
					},
				},
				lineItemComponents: {
					findFirst: async () => null,
					updateMany: async () => ({ count: 0 }),
				},
			} as any,
			49,
		);

		expect(result).toEqual({
			inboundId: 49,
			releasedDemandCount: 0,
			recomputedComponentCount: 0,
		});
		expect(updateCalled).toBe(false);
		expect(findManyCalls).toEqual([
			{
				where: {
					deletedAt: null,
					qtyReceived: 0,
					status: {
						in: ["pending", "ordered", "partially_received"],
					},
					inboundShipmentItem: {
						inboundId: 49,
						deletedAt: null,
						inbound: {
							status: "cancelled",
							deletedAt: null,
						},
					},
				},
				select: {
					id: true,
					lineItemComponentId: true,
				},
			},
		]);
	});

	test("returns a no-op result when no unreceived active demand is linked", async () => {
		let updateCalled = false;
		let recomputeCalled = false;
		const result = await releaseCancelledInboundShipmentDemand(
			{
				inboundDemand: {
					findMany: async () => [],
					updateMany: async () => {
						updateCalled = true;
						return { count: 0 };
					},
				},
				lineItemComponents: {
					findFirst: async () => {
						recomputeCalled = true;
						return null;
					},
					updateMany: async () => ({ count: 0 }),
				},
			} as any,
			45,
		);

		expect(result).toEqual({
			inboundId: 45,
			releasedDemandCount: 0,
			recomputedComponentCount: 0,
		});
		expect(updateCalled).toBe(false);
		expect(recomputeCalled).toBe(false);
	});

	test("does not recompute components when guarded release updates no rows", async () => {
		let recomputeCalled = false;
		const result = await releaseCancelledInboundShipmentDemand(
			{
				inboundDemand: {
					findMany: async () => [
						{
							id: 703,
							lineItemComponentId: 402,
						},
					],
					updateMany: async () => ({ count: 0 }),
				},
				lineItemComponents: {
					findFirst: async () => {
						recomputeCalled = true;
						return {
							id: 402,
							qty: 5,
							stockAllocations: [],
							inboundDemands: [],
						};
					},
					updateMany: async () => ({ count: 1 }),
				},
			} as any,
			46,
		);

		expect(result).toEqual({
			inboundId: 46,
			releasedDemandCount: 0,
			recomputedComponentCount: 0,
		});
		expect(recomputeCalled).toBe(false);
	});

	test("recomputes only components confirmed by guarded cancellation release", async () => {
		const updateManyCalls: unknown[] = [];
		const componentLookupIds: number[] = [];
		const componentUpdateCalls: unknown[] = [];
		const result = await releaseCancelledInboundShipmentDemand(
			{
				inboundDemand: {
					findMany: async () => [
						{
							id: 704,
							lineItemComponentId: 403,
						},
						{
							id: 705,
							lineItemComponentId: 404,
						},
					],
					updateMany: async (input: unknown) => {
						updateManyCalls.push(input);
						const id = (input as { where?: { id?: number } }).where?.id;
						return { count: id === 704 ? 1 : 0 };
					},
				},
				lineItemComponents: {
					findFirst: async (input: { where: { id: number } }) => {
						componentLookupIds.push(input.where.id);
						return {
							id: input.where.id,
							qty: 5,
							stockAllocations: [],
							inboundDemands: [],
						};
					},
					updateMany: async (input: unknown) => {
						componentUpdateCalls.push(input);
						return { count: 1 };
					},
				},
			} as any,
			47,
		);

		expect(result).toEqual({
			inboundId: 47,
			releasedDemandCount: 1,
			recomputedComponentCount: 1,
		});
		expect(updateManyCalls).toHaveLength(2);
		expect(componentLookupIds).toEqual([403]);
		expect(componentUpdateCalls).toEqual([
			{
				where: {
					id: 403,
					deletedAt: null,
				},
				data: {
					qtyAllocated: 0,
					qtyInbound: 0,
					qtyReceived: 0,
					status: "pending",
				},
			},
		]);
	});

	test("does not count recompute when component update guard skips", async () => {
		const componentUpdateCalls: unknown[] = [];
		const result = await releaseCancelledInboundShipmentDemand(
			{
				inboundDemand: {
					findMany: async () => [
						{
							id: 706,
							lineItemComponentId: 405,
						},
					],
					updateMany: async () => ({ count: 1 }),
				},
				lineItemComponents: {
					findFirst: async () => ({
						id: 405,
						qty: 5,
						stockAllocations: [],
						inboundDemands: [],
					}),
					updateMany: async (input: unknown) => {
						componentUpdateCalls.push(input);
						return { count: 0 };
					},
				},
			} as any,
			48,
		);

		expect(result).toEqual({
			inboundId: 48,
			releasedDemandCount: 1,
			recomputedComponentCount: 0,
		});
		expect(componentUpdateCalls).toEqual([
			{
				where: {
					id: 405,
					deletedAt: null,
				},
				data: {
					qtyAllocated: 0,
					qtyInbound: 0,
					qtyReceived: 0,
					status: "pending",
				},
			},
		]);
	});
});
