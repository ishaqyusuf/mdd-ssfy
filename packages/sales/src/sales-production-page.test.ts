import { describe, expect, it } from "bun:test";
import type { Db } from "@gnd/db";
import { getSalesProductions } from "./sales-production";

type Selection = { [key: string]: boolean | { select?: Selection; where?: unknown } };
type Query = {
	where?: { id?: { in: number[] }; AND?: unknown[] };
	select: Selection;
	skip?: number;
	take?: number;
};

// Honor selected fields recursively: another branch cannot supply omitted evidence.
function project(value: unknown, selection: Selection): unknown {
	if (value == null) return value;
	if (Array.isArray(value)) return value.map(item => project(item, selection));
	const source = value as Record<string, unknown>;
	return Object.fromEntries(Object.entries(selection).filter(([, pick]) => pick).map(([key, pick]) => [
		key, typeof pick === "object" && pick.select ? project(source[key], pick.select) : source[key],
	]));
}

const date = new Date("2026-07-01T12:00:00Z");
function order(id: number) {
	return {
		id, orderId: `ORDER-${id}`, status: null, prodStatus: null, createdAt: date,
		priority: "NORMAL", grandTotal: 150, amountDue: 0,
		customer: { name: "CUSTOMER", businessName: null }, billingAddress: null,
		salesRep: { name: "REP" }, stat: [], completionRecords: [],
		deliveries: [{ id: id * 10, status: "pending", meta: {}, dueDate: date, driverId: null, _count: { items: 1 } }],
		itemControls: [{ produceable: true, shippable: true, qtyControls: [{ type: "prodCompleted", itemTotal: 5, total: 0 }], assignments: [{ id }] }],
		assignments: [{ id, assignedAt: date, assignedToId: 17, createdAt: date,
			submissions: [{ id, lhQty: 0, rhQty: 0, qty: 1, createdAt: date, materialReview: { status: "APPROVED" } }],
			lhQty: 0, rhQty: 0, qtyAssigned: 3, qtyCompleted: 1, completedAt: null, dueDate: date, assignedTo: { name: "WORKER" },
		}],
	};
}

async function inLegacyMode<T>(run: () => Promise<T>) {
	const previous = process.env.SALES_PIPELINE_READ_MODE;
	process.env.SALES_PIPELINE_READ_MODE = "legacy";
	try { return await run(); }
	finally {
		if (previous === undefined) Reflect.deleteProperty(process.env, "SALES_PIPELINE_READ_MODE");
		else process.env.SALES_PIPELINE_READ_MODE = previous;
	}
}

describe("Production page evidence contract", () => {
	it("loads scoped details concurrently and preserves page order and populated evidence", () => inLegacyMode(async () => {
		const rows = [order(2), order(1)];
		let anchorWhere: unknown;
		let started = 0;
		let release!: () => void;
		let signalFirstStart!: () => void;
		const firstStarted = new Promise<void>(resolve => { signalFirstStart = resolve; });
		const gate = new Promise<void>(resolve => { release = resolve; });
		const db = { salesOrders: { findMany: async (query: Query) => {
			if (query.take !== undefined) {
				anchorWhere = query.where;
				expect(query.select).toEqual({ id: true });
				return rows.map(({ id }) => ({ id }));
			}
			expect(query.where?.id?.in).toEqual([2, 1]);
			if (query.select.customer) expect(query.where?.AND).toEqual([anchorWhere]);
			if (query.select.assignments) expect(JSON.stringify(query.select.assignments)).toContain('"assignedToId":17');
			started += 1;
			if (started === 1) signalFirstStart();
			await gate;
			return [...rows].reverse().map(row => project(row, query.select));
		} } };
		const pending = getSalesProductions(db as unknown as Db, {
			size: 20, assignedToId: 17, invoice: "paid", q: "CUSTOMER", includeMaterials: false,
		});
		try {
			await Promise.race([firstStarted, pending.then(() => undefined)]);
			expect(started).toBe(4);
		} finally {
			// A serialized-read regression must fail without stranding the request/env.
			release();
			await pending;
		}
		const result = await pending;
		expect(JSON.stringify(anchorWhere)).toContain("CUSTOMER");
		expect(JSON.stringify(anchorWhere)).toContain('"amountDue"');
		expect(result.data.map(row => row.id)).toEqual([2, 1]);
		expect(result.data[0]).toMatchObject({
			orderId: "ORDER-2", customer: "CUSTOMER", salesRep: "REP", assignedTo: "WORKER",
			totalAssigned: 3, totalCompleted: 1, assignedAt: date,
			invoice: { total: 150, amountDue: 0, status: "paid" },
		});
	}), 1500);

	it.each(["customer", "itemControls", "assignments", "deliveries"])("rejects a missing %s branch instead of returning a partial page", (missing) => inLegacyMode(async () => {
		const db = { salesOrders: { findMany: async (query: Query) => {
			if (query.take !== undefined) return [{ id: 1 }];
			return query.select[missing] ? [] : [project(order(1), query.select)];
		} } };
		await expect(getSalesProductions(db as unknown as Db, { size: 20, includeMaterials: false })).rejects.toThrow("Production order evidence changed. Refresh and retry.");
	}));

	it("rejects a replacement order even when all branch lengths match", () => inLegacyMode(async () => {
		const db = { salesOrders: { findMany: async (query: Query) => {
			if (query.take !== undefined) return [{ id: 1 }];
			return [project(order(query.select.assignments ? 2 : 1), query.select)];
		} } };
		await expect(getSalesProductions(db as unknown as Db, { size: 20, includeMaterials: false })).rejects.toThrow("Production order evidence changed. Refresh and retry.");
	}));
});
