import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const inventoryTabSource = readFileSync(
	new URL("./sales-overview-system/tabs/inventory-tab.tsx", import.meta.url),
	"utf8",
);

describe("sales inventory automatic synchronization UI", () => {
	test("runs a guarded background sync and keeps a manual retry", () => {
		expect(inventoryTabSource).toContain("shouldAutoSyncSalesInventory");
		expect(inventoryTabSource).toContain("inventoryAutoSyncAttempts");
		expect(inventoryTabSource).toContain("Retry synchronization");
		expect(inventoryTabSource).toContain("Synchronize inventory");
	});

	test("refreshes the infinite orders table when synchronization completes", () => {
		expect(inventoryTabSource).toContain(
			"trpc.sales.getOrders.infiniteQueryKey()",
		);
		expect(inventoryTabSource).toContain(
			"trpc.sales.getOrdersSummary.queryKey()",
		);
	});
});
