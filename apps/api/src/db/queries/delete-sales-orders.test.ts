import { expect, it } from "bun:test";
import { deleteSalesOrdersByOrderIds } from "./delete-sales-orders";

it("bounds the write to captured IDs and does not infer partial deletion identities", async () => {
	let count = 2;
	let write: unknown;
	const db = { salesOrders: {
		findMany: async () => [{ id: 11 }, { id: 12 }],
		updateMany: async (input: unknown) => { write = input; return { count }; },
	} } as unknown as Parameters<typeof deleteSalesOrdersByOrderIds>[0];
	expect((await deleteSalesOrdersByOrderIds(db, ["order"])).deletedSalesIds).toEqual([11, 12]);
	expect((write as { where: unknown }).where).toEqual({ id: { in: [11, 12] } });
	count = 1;
	const partial = await deleteSalesOrdersByOrderIds(db, ["order"]);
	expect(partial.count).toBe(1);
	expect(partial.deletedSalesIds).toEqual([]);
});

it("does not issue an unbounded write when no orders match", async () => {
	let writes = 0;
	const db = { salesOrders: {
		findMany: async () => [],
		updateMany: async () => { writes++; return { count: 0 }; },
	} } as unknown as Parameters<typeof deleteSalesOrdersByOrderIds>[0];
	expect((await deleteSalesOrdersByOrderIds(db, ["missing"])).count).toBe(0);
	expect(writes).toBe(0);
});
