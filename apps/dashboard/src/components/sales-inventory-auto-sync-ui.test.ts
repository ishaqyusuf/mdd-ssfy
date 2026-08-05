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
		expect(inventoryTabSource).toContain(
			"trpc.inventories.salesInventoryOrderRepairPreview.queryKey",
		);
	});

	test("shows separate available and ordered coverage on flat divided rows", () => {
		expect(inventoryTabSource).toContain("resolveInventoryCoverageDisplay");
		expect(inventoryTabSource).toContain("coverage.showAvailable");
		expect(inventoryTabSource).toContain("coverage.showOrdered");
		expect(inventoryTabSource).toContain("AVAILABLE:");
		expect(inventoryTabSource).toContain("ORDERED:");
		expect(inventoryTabSource).toContain("border-b border-border");
		expect(inventoryTabSource).toContain("hover:bg-muted/50");
	});

	test("uses flat item-to-order rows with grouped bounded quantity controls", () => {
		expect(inventoryTabSource).toContain('aria-label="Items to order"');
		expect(inventoryTabSource).toContain(
			"Order quantity controls for ${row.componentName}",
		);
		expect(inventoryTabSource).toContain("<InputGroupInput");
		expect(inventoryTabSource).toContain("<InputGroupText");
		expect(inventoryTabSource).toContain("/{formatQty(maxQty)}");
		expect(inventoryTabSource).toContain("border-b border-border");
		expect(inventoryTabSource).toContain("hover:bg-muted/50");
		expect(inventoryTabSource).not.toContain(
			'className="flex items-start gap-3 rounded-md border p-2 hover:bg-muted/40"',
		);
	});
});
