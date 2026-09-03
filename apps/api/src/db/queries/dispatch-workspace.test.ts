import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { getDispatchWorkspaceSummary } from "./dispatch-workspace";

describe("getDispatchWorkspaceSummary", () => {
	it("projects lifecycle counts from canonical dispatch records", async () => {
		const dispatches = [
			{
				id: 1,
				salesOrderId: 101,
				status: "queue",
				driverId: null,
				deliveryMode: "delivery",
				dueDate: null,
			},
			{
				id: 2,
				salesOrderId: 102,
				status: "missing items",
				driverId: 12,
				deliveryMode: "delivery",
				dueDate: null,
			},
			{
				id: 3,
				salesOrderId: 103,
				status: "packed",
				driverId: 12,
				deliveryMode: "delivery",
				dueDate: null,
			},
			{
				id: 4,
				salesOrderId: 104,
				status: "in progress",
				driverId: 13,
				deliveryMode: "delivery",
				dueDate: null,
			},
			{
				id: 5,
				salesOrderId: 105,
				status: "completed",
				meta: { dispatchCompletion: { status: "completed" } },
				driverId: 13,
				deliveryMode: "delivery",
				dueDate: null,
			},
			{
				id: 6,
				salesOrderId: 106,
				status: "cancelled",
				driverId: null,
				deliveryMode: "delivery",
				dueDate: null,
			},
			{
				id: 7,
				salesOrderId: 107,
				status: null,
				driverId: 14,
				deliveryMode: "delivery",
				dueDate: null,
			},
			{
				id: 8,
				salesOrderId: 105,
				status: "completed",
				meta: { dispatchCompletion: { status: "completed" } },
				driverId: 13,
				deliveryMode: "delivery",
				dueDate: null,
			},
			{
				id: 9,
				salesOrderId: 109,
				status: "completed",
				meta: { dispatchCompletion: { status: "completed" } },
				driverId: 13,
				deliveryMode: "delivery",
				dueDate: null,
				_count: { items: 0, stockAllocations: 0 },
			},
		].map((row) => ({
			meta: null,
			_count: { items: 1, stockAllocations: 0 },
			...row,
		}));
		const pipelineOrder = (id: number) => {
			const orderDispatches = dispatches.filter(
				(dispatch) => dispatch.salesOrderId === id,
			);
			const requiredQty = Math.max(
				1,
				orderDispatches.reduce(
					(total, dispatch) => total + dispatch._count.items,
					0,
				),
			);
			return {
				id,
				orderId: String(id),
				status: "open",
				prodStatus: null,
				deletedAt: null,
				archivedAt: null,
				grandTotal: 100,
				amountDue: 0,
				updatedAt: new Date("2026-09-02T12:00:00.000Z"),
				inventoryProjection: null,
				stat: [],
				completionRecords: [],
				itemControls: [
					{
						uid: `item-${id}`,
						produceable: false,
						shippable: true,
						qtyControls: [
							{
								type: "qty",
								total: requiredQty,
								itemTotal: requiredQty,
								qty: requiredQty,
								updatedAt: new Date("2026-09-02T12:00:00.000Z"),
							},
						],
					},
				],
				assignments: [],
				deliveries: orderDispatches.map((dispatch) => ({
					...dispatch,
					updatedAt: new Date("2026-09-02T12:00:00.000Z"),
					items: Array.from({ length: dispatch._count.items }, (_, index) => ({
						id: dispatch.id * 10 + index,
						qty: 1,
						updatedAt: new Date("2026-09-02T12:00:00.000Z"),
					})),
				})),
			};
		};
		const db = {
			orderDelivery: {
				findMany: async () =>
					dispatches.filter(
						(dispatch) =>
							dispatch.status !== "completed" || dispatch.salesOrderId === 109,
					),
			},
			salesOrderListProjection: {
				count: async (args: {
					where: { pipelineFulfillmentState?: string | { in?: string[] } };
				}) => {
					const state = args.where.pipelineFulfillmentState;
					if (state === "backlog") return 3;
					if (typeof state === "object" && state.in?.includes("fulfilled")) {
						return 1;
					}
					return 9;
				},
			},
			salesOrders: {
				findMany: async () => [],
			},
			dispatchException: { count: async () => 2 },
			salesPackingReport: {
				groupBy: async () => [{ orderDeliveryId: 2 }, { orderDeliveryId: 3 }],
			},
			users: { count: async () => 5 },
		};

		const summary = await getDispatchWorkspaceSummary({
			db,
		} as unknown as TRPCContext);

		expect(summary).toEqual({
			backlog: 3,
			active: 5,
			dueToday: 0,
			pastDue: 0,
			completed: 1,
			all: 9,
			openExceptions: 4,
			overdue: 0,
			driverCount: 5,
			byStage: {
				readyToAssign: 1,
				assigned: 1,
				packing: 0,
				packingBlocked: 2,
				readyToLoad: 1,
				inTransit: 1,
				fulfilled: 1,
				cancelled: 1,
			},
		});
	});
});
