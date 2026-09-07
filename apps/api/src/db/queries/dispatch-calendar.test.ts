import { expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { getDispatchCalendar } from "./dispatch-calendar";

it("returns business-day scheduled pages and a separate undated queue without merging dispatches", async () => {
	const previous = process.env.BUSINESS_TIME_ZONE;
	process.env.BUSINESS_TIME_ZONE = "America/New_York";
	try {
		const now = new Date("2026-09-07T12:00:00Z");
		const order = { id: 1, orderId: "CALENDAR-1", type: "order", status: "open", prodStatus: "pending", grandTotal: 100, amountDue: 0, meta: {}, payments: [], createdAt: now, updatedAt: now, deletedAt: null, archivedAt: null, stat: [] };
		const records = [
			{ id: 10, dueDate: new Date("2026-09-07T03:59:59Z") },
			{ id: 11, dueDate: new Date("2026-09-07T04:00:00Z") },
			{ id: 12, dueDate: new Date("2026-09-08T03:59:59Z") },
			{ id: 13, dueDate: null },
			{ id: 14, dueDate: new Date("2026-09-08T04:00:00Z") },
		];
		const selected = (where: any) => {
			const matchesStatus = (condition: any): boolean => {
				if (condition.AND && !condition.AND.every(matchesStatus)) return false;
				if (condition.OR && !condition.OR.some(matchesStatus)) return false;
				if (typeof condition.status === "string") return condition.status === "queue";
				if (condition.status?.in) return condition.status.in.includes("queue");
				return true;
			};
			if (!matchesStatus(where)) return [];
			const due = where.AND[1].dueDate;
			return records.filter(row => due === null ? row.dueDate === null : row.dueDate && row.dueDate >= due.gte && row.dueDate < due.lt);
		};
		const db = {
			salesOrders: { findMany: async () => [{ ...order, inventoryProjection: { needCount: 0, status: "ready", updatedAt: now }, itemControls: [{ uid: "item-1", produceable: true, shippable: true, qtyControls: [{ type: "qty", total: 2, itemTotal: 2, qty: 2, updatedAt: now }] }], assignments: [], deliveries: [], completionRecords: [{ id: 1, milestone: "FULFILLMENT_COMPLETED", completionMethod: "STATUS_ONLY", recordedAt: now, effectiveAt: now, recordedById: 7 }] }] },
			salesItemControl: { findMany: async () => [] },
			orderItemDelivery: { findMany: async () => [] },
			orderDelivery: {
				count: async ({ where }: any) => selected(where).length,
				findMany: async ({ where, skip = 0, take = 100, select }: any) => select.order ? selected(where).slice(skip, skip + take).map(row => ({ ...row, status: "queue", salesOrderId: 1, meta: {}, createdAt: now, updatedAt: now, deletedAt: null, deliveredAt: null, deliveryMode: "pickup", driverId: null, _count: { items: 1, stockAllocations: 0, exceptions: 0 }, order, driver: null })) : [],
			},
		};
		const ctx = { db } as unknown as TRPCContext;
		const input = { from: "2026-09-07", to: "2026-09-07", section: "calendar" as const, unscheduled: false, size: 1, sort: ["deliveredAt.desc"] };
		const first = await getDispatchCalendar(ctx, input);
		expect(first.data.map(row => row.id)).toEqual([11]);
		expect(first.data[0]?.calendarDate).toBe("2026-09-07");
		expect(first.data[0]?.calendarLabel).toBe("Marked as completed");
		expect(first.data[0]?.calendarCompleted).toBe(true);
		expect(first.meta.cursor).toBe("1");
		const second = await getDispatchCalendar(ctx, { ...input, cursor: first.meta.cursor });
		expect(second.data.map(row => row.id)).toEqual([12]);
		expect(second.data[0]?.order.id).toBe(first.data[0]?.order.id);
		expect(second.meta.cursor).toBeNull();
		const fulfilled = await getDispatchCalendar(ctx, { ...input, stages: ["fulfilled"] });
		expect(fulfilled.data.map(row => row.id)).toEqual([11]);
		expect(fulfilled.data[0]?.calendarTone).toBe("completed");
		const fulfilledNext = await getDispatchCalendar(ctx, { ...input, stages: ["fulfilled"], cursor: fulfilled.meta.cursor });
		expect(fulfilledNext.data.map(row => row.id)).toEqual([12]);
		expect(fulfilledNext.meta.cursor).toBeNull();
		const undated = await getDispatchCalendar(ctx, { ...input, unscheduled: true });
		expect(undated.data.map(row => row.id)).toEqual([13]);
		expect(undated.data[0]?.calendarDate).toBeNull();
	} finally {
		if (previous === undefined) delete process.env.BUSINESS_TIME_ZONE;
		else process.env.BUSINESS_TIME_ZONE = previous;
	}
});
