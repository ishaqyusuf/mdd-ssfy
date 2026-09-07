import { describe, expect, it } from "bun:test";
import type { Db } from "@gnd/db";
import { salesProductionPlanningCalendarQuerySchema } from "./schema";
import { productionScheduleMoveSchema } from "./schedule-move";
import {
	getSalesProductionPlanningCalendar,
	productionPlanningRange,
} from "./sales-production-planning-calendar";

describe("Production planning date-only range", () => {
	it("rejects a planning discriminator even when a caller supplies schedule fields", () => {
		const schedule = { requestId: "00000000-0000-4000-8000-000000000001", salesOrderId: 1, sourceDate: "2026-09-07", targetDate: "2026-09-08", expectedRevision: "a".repeat(64) };
		expect(productionScheduleMoveSchema.safeParse(schedule).success).toBe(true);
		expect(productionScheduleMoveSchema.safeParse({ ...schedule, kind: "planning" }).success).toBe(false);
	});
	it("rejects caller-selected worker scope and forged permissions", () => {
		const dates = { from: "2026-09-01", to: "2026-09-02" };
		for (const extra of [
			{ assignedToId: 1 },
			{ canAssign: true },
			{ scope: "all" },
		]) {
			expect(
				salesProductionPlanningCalendarQuerySchema.safeParse({
					...dates,
					...extra,
				}).success,
			).toBe(false);
		}
		expect(
			salesProductionPlanningCalendarQuerySchema.safeParse(dates).success,
		).toBe(true);
	});
	it("caps reads at 42 inclusive calendar days", () => {
		expect(productionPlanningRange("2026-09-01", "2027-01-01")).toEqual({
			gte: new Date("2026-09-01T00:00:00Z"),
			lt: new Date("2026-10-13T00:00:00Z"),
		});
	});
	it("includes the selected final day through spring and fall DST transitions", () => {
		for (const [from, to, end] of [
			["2026-03-07", "2026-03-09", "2026-03-10"],
			["2026-10-31", "2026-11-02", "2026-11-03"],
		] as const) {
			const range = productionPlanningRange(from, to);
			expect(range.lt.toISOString()).toBe(`${end}T00:00:00.000Z`);
			expect(range.lt.getTime() - range.gte.getTime()).toBe(3 * 86_400_000);
		}
	});
	it("rejects inverted, invalid and timestamp-shaped inputs", () => {
		expect(() => productionPlanningRange("2026-09-02", "2026-09-01")).toThrow();
		expect(() => productionPlanningRange("2026-02-30", "2026-03-01")).toThrow();
		expect(() =>
			productionPlanningRange("2026-09-01T12:00:00Z", "2026-09-02"),
		).toThrow();
	});
});

describe("Production planning database projection", () => {
	it("loads canonical evidence in batches and returns date provenance and exact gaps", async () => {
		const calls: Array<Record<string, unknown>> = [];
		const updatedAt = new Date("2026-09-07T12:00:00Z");
		const orders = [1, 2].map((id) => ({
			id,
			orderId: `ORDER-${id}`,
			slug: `order-slug-${id}`,
			status: "open",
			prodStatus: null,
			deletedAt: null,
			archivedAt: null,
			updatedAt,
			grandTotal: 100,
			amountDue: 0,
			priority: "normal",
			prodDueDate: updatedAt,
			customer: { name: "Customer", businessName: null },
			inventoryProjection: null,
			stat: [],
			completionRecords: [],
			deliveries: [],
			itemControls: [
				{
					uid: `item-${id}`,
					produceable: true,
					shippable: false,
					qtyControls: [{ type: "qty", total: 5, updatedAt }],
				},
			],
			assignments:
				id === 1
					? []
					: [
							{
								id: 20,
								qtyAssigned: 2,
								qtyCompleted: 0,
								assignedToId: 3,
								assignedTo: { name: "Worker" },
								submissions: [],
								updatedAt,
								assignedAt: null,
								completedAt: null,
								dueDate: updatedAt,
							},
						],
		}));
		const db = {
			salesOrders: {
				findMany: async (args: Record<string, unknown>) => {
					calls.push(args);
					return orders;
				},
			},
		} as unknown as Db;
		const result = await getSalesProductionPlanningCalendar(
			db,
			{
				from: "2026-09-07",
				to: "2026-09-07",
			},
			{ canAssign: true, now: updatedAt },
		);
		expect(
			result.planning.map((row) => [row.orderId, row.uncoveredQty]),
		).toEqual([
			[1, 5],
			[2, 3],
		]);
		expect(result.planning[1]).toMatchObject({
			kind: "planning",
			dateProvenance: "Order production due date",
			workers: ["Worker"],
			canAssign: true,
			due: { bucket: "today" },
		});
		expect(result.days).toEqual([{ date: "2026-09-07", count: 2 }]);
		expect(result.truncated).toBe(false);
		expect(calls).toHaveLength(5);
		expect(calls[0]).toMatchObject({
			take: 1501,
			orderBy: [{ prodDueDate: "asc" }, { id: "asc" }],
			where: {
				AND: expect.arrayContaining([
					{
						type: "order",
						deletedAt: null,
						archivedAt: null,
						prodDueDate: productionPlanningRange("2026-09-07", "2026-09-07"),
					},
				]),
			},
		});
		for (const call of calls.slice(1))
			expect(call.where).toEqual({ id: { in: [1, 2] } });
	});

	it("does not load evidence for an empty date range result", async () => {
		let calls = 0;
		const db = {
			salesOrders: {
				findMany: async () => {
					calls++;
					return [];
				},
			},
		} as unknown as Db;
		const result = await getSalesProductionPlanningCalendar(db, {
			from: "2026-09-07",
			to: "2026-09-07",
		});
		expect(calls).toBe(1);
		expect(result.planning).toEqual([]);
		expect(result.count).toBe(0);
	});
});
