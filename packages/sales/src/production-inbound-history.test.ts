import { expect, test } from "bun:test";
import type { Db } from "@gnd/db";
import { getProductionInboundHistory } from "./production-inbound-history";

test("workers never query or receive admin receipt history", async () => {
	const db = { event: { findMany: () => { throw new Error("must not query"); } } } as unknown as Db;
	expect(await getProductionInboundHistory(db, { salesOrderId: 1 }, false)).toEqual({ receipts: [], nextReceiptCursor: null });
});

test("receipt history survives separate reads and preserves the originating event identity", async () => {
	const db = { event: { findMany: async (query: any) => query.where.type === "production_inbound_cancelled" ? [] : [
		{ id: 15, createdAt: new Date("2026-09-08"), data: { salesOrderId: 1, inboundId: 7 } },
		{ id: 14, createdAt: null, data: { salesOrderId: 2, inboundId: 8 } },
		{ id: 13, createdAt: null, data: { salesOrderId: 1, inboundId: "bad" } },
	] } } as unknown as Db;
	const first = await getProductionInboundHistory(db, { salesOrderId: 1 }, true);
	expect(first.receipts).toHaveLength(1);
	expect(first.receipts[0]).toMatchObject({ receiptId: 15, inboundId: 7 });
	expect(await getProductionInboundHistory(db, { salesOrderId: 1 }, true)).toEqual(first);
});

test("history pages by immutable event identity and scopes the order and inbound", async () => {
	const db = { event: { findMany: async (query: any) => {
		if (query.where.type === "production_inbound_cancelled") return [];
		expect(query.where).toMatchObject({ type: "production_inbound_received", deletedAt: null, id: { lt: 100 } });
		expect(query.where.AND).toEqual([
			{ data: { path: "$.salesOrderId", equals: 1 } },
			{ data: { path: "$.inboundId", equals: 7 } },
		]);
		return Array.from({ length: 21 }, (_, i) => ({ id: 99 - i, createdAt: null, data: { salesOrderId: 1, inboundId: 7 } }));
	} } } as unknown as Db;
	const page = await getProductionInboundHistory(db, { salesOrderId: 1, inboundId: 7, cursor: 100 }, true);
	expect(page.receipts).toHaveLength(20);
	expect(page.nextReceiptCursor).toBe(80);
});
