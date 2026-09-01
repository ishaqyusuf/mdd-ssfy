import { describe, expect, it } from "bun:test";
import type { Db } from "@gnd/db";

import {
	getSalesProductionCalendar,
	getSalesProductions,
	isProductionCompleted,
	sortProductionListByPriority,
} from "./sales-production";
import { salesProductionQueryParamsSchema } from "./schema";
import { whereSales } from "./utils/where-queries";

type SalesFindManyArgs = {
	take?: number;
	skip?: number;
};

function productionRow(id: number, priority: string) {
	return {
		id,
		orderId: `ORDER-${id}`,
		status: null,
		prodStatus: null,
		createdAt: new Date(`2026-07-${String(id).padStart(2, "0")}T12:00:00Z`),
		priority,
		grandTotal: 1250,
		amountDue: 250,
		customer: null,
		billingAddress: null,
		salesRep: null,
		stat: [],
		deliveries: [],
		itemControls: [],
		assignments: [],
	};
}

describe("sales production priority sorting", () => {
	it("keeps completed assignments on the production calendar", async () => {
		let capturedWhere: unknown;
		const completedAt = new Date("2026-09-01T12:00:00.000Z");
		const dueDate = new Date("2026-09-01T09:00:00.000Z");
		const db = {
			orderItemProductionAssignments: {
				findMany: async (args: { where?: unknown }) => {
					capturedWhere = args.where;
					return [
						{
							id: 91,
							assignedToId: 17,
							startedAt: dueDate,
							completedAt,
							dueDate,
							assignedTo: { name: "Worker" },
							order: {
								id: 42,
								orderId: "ORDER-42",
								priority: "NORMAL",
								customer: { name: "Acme", businessName: null },
							},
						},
					];
				},
			},
		};

		const result = await getSalesProductionCalendar(db as unknown as Db, {
			from: "2026-09-01",
			to: "2026-09-07",
		});

		expect(JSON.stringify(capturedWhere)).not.toContain(
			'"type":"prodCompleted"',
		);
		expect(result.scheduled).toHaveLength(1);
		expect(result.scheduled[0]).toMatchObject({
			orderNo: "ORDER-42",
			status: "completed",
		});
	});

	it("loads the global candidate set before applying a production sort", async () => {
		const findManyCalls: SalesFindManyArgs[] = [];
		const db = {
			salesOrders: {
				count: async () => 1000,
				findMany: async (args: SalesFindManyArgs) => {
					findManyCalls.push(args);
					return [];
				},
			},
		};

		await getSalesProductions(db as unknown as Db, {
			production: "pending",
			productionSort: "priority",
			size: 20,
			cursor: "40",
		});

		expect(findManyCalls).toHaveLength(1);
		expect(findManyCalls[0].take).toBeUndefined();
		expect(findManyCalls[0].skip).toBeUndefined();
	});

	it("bounds material-enriched production pages", async () => {
		const findManyCalls: SalesFindManyArgs[] = [];
		const db = {
			salesOrders: {
				count: async () => 1000,
				findMany: async (args: SalesFindManyArgs) => {
					findManyCalls.push(args);
					return [];
				},
			},
		};

		await getSalesProductions(db as unknown as Db, {
			production: "pending",
			size: 999,
		});

		expect(findManyCalls[0].take).toBe(100);
		expect(
			salesProductionQueryParamsSchema.safeParse({ size: 101 }).success,
		).toBe(false);
	});

	it("keeps the next cursor on the first unconsumed sorted candidate", async () => {
		let call = 0;
		const db = {
			salesOrders: {
				findMany: async () => {
					call += 1;
					if (call === 1) {
						return [
							productionRow(2, "NORMAL"),
							productionRow(3, "LOW"),
							productionRow(1, "CRITICAL"),
						];
					}
					return [
						productionRow(1, "CRITICAL"),
						productionRow(2, "NORMAL"),
						productionRow(3, "LOW"),
					];
				},
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "pending",
			productionSort: "priority",
			size: 1,
		});

		expect(result.data.map((row) => row.id)).toEqual([1]);
		expect(result.meta.cursor).toBe("1");
	});

	it("keeps later material-filtered pages reachable without a global rescan", async () => {
		let call = 0;
		const rows = [
			productionRow(1, "CRITICAL"),
			productionRow(2, "NORMAL"),
			productionRow(3, "LOW"),
		];
		const db = {
			salesOrders: {
				findMany: async () => {
					call += 1;
					return call === 1 ? rows : rows;
				},
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "pending",
			material: "unavailable",
			size: 1,
		});

		expect(result.data.map((row) => row.id)).toEqual([1]);
		expect(result.meta.count).toBeUndefined();
		expect(result.meta.cursor).toBe("1");
	});

	it("preserves search and cursor when a canonical due filter is active", async () => {
		const findManyCalls: Array<SalesFindManyArgs & { where?: unknown }> = [];
		const db = {
			salesOrders: {
				count: async () => 100,
				findMany: async (args: SalesFindManyArgs & { where?: unknown }) => {
					findManyCalls.push(args);
					return [];
				},
			},
		};

		await getSalesProductions(db as unknown as Db, {
			due: "today",
			q: "needle",
			size: 20,
			cursor: "40",
		});

		expect(findManyCalls[0]?.skip).toBe(40);
		expect(JSON.stringify(findManyCalls[0]?.where)).toContain("needle");
	});

	it("requires every active assignment to have an owner for Ready", () => {
		const where = whereSales({
			production: "pending",
			"production.assignment": "all assigned",
		});
		const serialized = JSON.stringify(where);

		expect(serialized).toContain('"some"');
		expect(serialized).toContain('"none"');
		expect(serialized).toContain('"assignedToId":null');
		expect(serialized).toContain('"type":"prodAssigned"');
		expect(serialized).toContain('"percentage":100');
	});

	it("requires a live positive-quantity production control for production queues", () => {
		const serialized = JSON.stringify(
			whereSales({
				production: "pending",
				"production.status": "unscheduled",
			}),
		);

		expect(serialized).toContain('"itemControls"');
		expect(serialized).toContain('"item":{"is":{"deletedAt":null}}');
		expect(serialized).toContain('"produceable":true');
		expect(serialized).toContain('"type":"qty"');
		expect(serialized).toContain('"total":{"gt":0}');
	});

	it("treats null-owner assignment rows as Unassigned", () => {
		const serialized = JSON.stringify(
			whereSales({
				production: "pending",
				"production.assignment": "not assigned",
			}),
		);

		expect(serialized).toContain('"none"');
		expect(serialized).toContain('"assignedToId":{"not":null}');
	});

	it("keeps the production queue available when material lookup fails", async () => {
		const db = {
			salesOrders: {
				count: async () => 1,
				findMany: async () => [
					{
						id: 42,
						orderId: "ORDER-42",
						createdAt: new Date("2026-07-28T12:00:00.000Z"),
						priority: "NORMAL",
						customer: null,
						billingAddress: null,
						salesRep: null,
						stat: [],
						itemControls: [],
						assignments: [],
					},
				],
			},
			lineItem: {
				findMany: async () => {
					throw new Error("inventory unavailable");
				},
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "pending",
			size: 20,
		});

		expect(result.data[0]?.materials.state).toBe("unavailable");
	});

	it("projects lifecycle status for batch completion eligibility", async () => {
		const db = {
			salesOrders: {
				count: async () => 1,
				findMany: async () => [
					{
						...productionRow(43, "NORMAL"),
						status: "Completed",
					},
				],
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "completed",
			includeMaterials: false,
			size: 20,
		});

		expect(result.data[0]?.lifecycleStatus).toBe("fulfilled");
	});

	it("projects a read-only invoice total and payment status", async () => {
		const db = {
			salesOrders: {
				count: async () => 1,
				findMany: async () => [
					{
						...productionRow(45, "NORMAL"),
						grandTotal: 1250,
						amountDue: 0,
					},
				],
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "completed",
			includeMaterials: false,
			size: 20,
		});

		expect(result.data[0]?.invoice).toEqual({
			total: 1250,
			amountDue: 0,
			status: "paid",
		});
	});

	it("excludes fulfilled deliveries when legacy production stats are stale", async () => {
		const db = {
			salesOrders: {
				findMany: async () => [
					{
						...productionRow(44, "NORMAL"),
						prodStatus: "in progress",
						deliveries: [{ status: "Completed", _count: { items: 1 } }],
					},
				],
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			production: "pending",
			includeMaterials: false,
			size: 20,
		});

		expect(result.data).toEqual([]);
	});

	it("returns work completed by the authenticated worker before the full order completes", async () => {
		const incomplete = {
			...productionRow(1, "NORMAL"),
			assignments: [
				{
					qtyAssigned: 2,
					lhQty: 0,
					rhQty: 0,
					completedAt: null,
					dueDate: null,
					assignedTo: { name: "Worker" },
					submissions: [],
				},
			],
		};
		const complete = {
			...productionRow(2, "NORMAL"),
			assignments: [
				{
					qtyAssigned: 2,
					lhQty: 0,
					rhQty: 0,
					completedAt: null,
					dueDate: null,
					assignedTo: { name: "Worker" },
					submissions: [
						{
							qty: 2,
							lhQty: 0,
							rhQty: 0,
							materialReview: null,
						},
					],
				},
			],
		};
		const db = {
			salesOrders: {
				findMany: async () => [incomplete, complete],
			},
		};

		const result = await getSalesProductions(db as unknown as Db, {
			workerId: 17,
			production: "completed",
			includeMaterials: false,
			size: 20,
		});

		expect(result.data.map((row) => row.id)).toEqual([2]);
	});

	it("sorts production queue by priority before due date", () => {
		const sorted = sortProductionListByPriority([
			{
				orderId: "NORMAL-DUE-FIRST",
				priority: "NORMAL",
				dueDate: "2026-05-14",
			},
			{ orderId: "LOW", priority: "LOW", dueDate: "2026-05-13" },
			{ orderId: "CRITICAL", priority: "CRITICAL", dueDate: "2026-05-16" },
			{ orderId: "HIGH", priority: "HIGH", dueDate: "2026-05-15" },
		]);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"CRITICAL",
			"HIGH",
			"NORMAL-DUE-FIRST",
			"LOW",
		]);
	});

	it("uses due date within the same priority", () => {
		const sorted = sortProductionListByPriority([
			{ orderId: "LATER", priority: "HIGH", dueDate: "2026-05-18" },
			{ orderId: "SOONER", priority: "HIGH", dueDate: "2026-05-15" },
		]);

		expect(sorted.map((item) => item.orderId)).toEqual(["SOONER", "LATER"]);
	});

	it("sorts by soonest due date with missing due dates last", () => {
		const sorted = sortProductionListByPriority(
			[
				{ orderId: "NO-DATE", priority: "CRITICAL", dueDate: null },
				{ orderId: "LATER", priority: "LOW", dueDate: "2026-05-18" },
				{ orderId: "SOONER", priority: "NORMAL", dueDate: "2026-05-15" },
			],
			"dueDateAsc",
		);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"SOONER",
			"LATER",
			"NO-DATE",
		]);
	});

	it("sorts by latest due date with missing due dates last", () => {
		const sorted = sortProductionListByPriority(
			[
				{ orderId: "NO-DATE", priority: "CRITICAL", dueDate: null },
				{ orderId: "LATER", priority: "LOW", dueDate: "2026-05-18" },
				{ orderId: "SOONER", priority: "NORMAL", dueDate: "2026-05-15" },
			],
			"dueDateDesc",
		);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"LATER",
			"SOONER",
			"NO-DATE",
		]);
	});

	it("uses priority as the tie-breaker for matching due dates", () => {
		const sorted = sortProductionListByPriority(
			[
				{ orderId: "LOW", priority: "LOW", dueDate: "2026-05-15" },
				{ orderId: "CRITICAL", priority: "CRITICAL", dueDate: "2026-05-15" },
			],
			"dueDateAsc",
		);

		expect(sorted.map((item) => item.orderId)).toEqual(["CRITICAL", "LOW"]);
	});

	it("sorts newest orders first with id as a stable tie-breaker", () => {
		const sorted = sortProductionListByPriority(
			[
				{ id: 10, orderId: "OLDER", createdAt: "2026-05-14" },
				{ id: 12, orderId: "NEWER", createdAt: "2026-05-16" },
				{ id: 11, orderId: "SAME-DAY-HIGHER-ID", createdAt: "2026-05-14" },
			],
			"newest",
		);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"NEWER",
			"SAME-DAY-HIGHER-ID",
			"OLDER",
		]);
	});

	it("sorts oldest orders first with id as a stable tie-breaker", () => {
		const sorted = sortProductionListByPriority(
			[
				{ id: 12, orderId: "NEWER", createdAt: "2026-05-16" },
				{ id: 11, orderId: "SAME-DAY-HIGHER-ID", createdAt: "2026-05-14" },
				{ id: 10, orderId: "OLDER", createdAt: "2026-05-14" },
			],
			"oldest",
		);

		expect(sorted.map((item) => item.orderId)).toEqual([
			"OLDER",
			"SAME-DAY-HIGHER-ID",
			"NEWER",
		]);
	});
});

describe("sales production completion detection", () => {
	it("treats a fully completed production stat as completed", () => {
		expect(
			isProductionCompleted({
				productionStat: { total: 4, percentage: 100 },
				totalAssigned: 4,
				totalCompleted: 0,
				totalProductionQty: 4,
			}),
		).toBe(true);
	});

	it("treats fully submitted due assignments as completed", () => {
		expect(
			isProductionCompleted({
				productionStat: { total: 4, percentage: 50 },
				totalAssigned: 2,
				totalCompleted: 2,
				totalProductionQty: 4,
				useAssignmentCompletion: true,
			}),
		).toBe(true);
	});

	it("does not let partial assignment submissions count as completed", () => {
		expect(
			isProductionCompleted({
				productionStat: { total: 4, percentage: 50 },
				totalAssigned: 4,
				totalCompleted: 2,
				totalProductionQty: 4,
				useAssignmentCompletion: true,
			}),
		).toBe(false);
	});
});
