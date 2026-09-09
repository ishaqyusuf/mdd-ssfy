import { expect, it } from "bun:test";
import type { TransactionClient } from "@gnd/db";
import { persistSalesQuantityStats } from "./sales-stat-persistence";
it("refreshes a row inserted by another projection without losing the latest quantities", async () => {
	const rows = new Map([["door-1|qty", { qty: 1 }]]);
	const tx = {
		qtyControl: {
			upsert: async ({
				create,
				update,
			}: {
				create: { itemControlUid: string; type: string; qty: number };
				update: { qty: number };
			}) => {
				const key = `${create.itemControlUid}|${create.type}`;
				rows.set(key, rows.has(key) ? update : create);
			},
		},
	} as unknown as Pick<TransactionClient, "qtyControl">;
	const proposed = [{ itemControlUid: "door-1", type: "qty", qty: 4 }];
	await persistSalesQuantityStats(tx, proposed);
	await persistSalesQuantityStats(tx, proposed);
	expect(rows.size).toBe(1);
	expect(rows.get("door-1|qty")?.qty).toBe(4);
});
