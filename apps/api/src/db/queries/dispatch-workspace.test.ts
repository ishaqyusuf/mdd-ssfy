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
		];
		const db = {
			orderDelivery: { findMany: async () => dispatches },
			salesOrders: { count: async () => 3 },
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
			active: 4,
			dueToday: 0,
			pastDue: 0,
			completed: 1,
			all: 7,
			openExceptions: 4,
			overdue: 0,
			driverCount: 5,
			byStage: {
				readyToAssign: 1,
				assigned: 1,
				packing: 0,
				packingBlocked: 1,
				readyToLoad: 1,
				inTransit: 1,
				fulfilled: 1,
				cancelled: 1,
			},
		});
	});
});
