import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function source(path: string) {
	return readFileSync(
		resolve(dirname(fileURLToPath(import.meta.url)), path),
		"utf8",
	);
}

const screen = source("./components/inventory-fulfillment-screen.tsx");
const list = source("./components/inventory-fulfillment-list.tsx");
const actions = source("./api/use-inventory-fulfillment-actions.ts");
const backorderQuery = source("./api/use-inventory-backorder-queue.ts");
const partialQuery = source("./api/use-inventory-partial-shipment-queue.ts");
const dashboard = source(
	"./components/inventory-fulfillment-dashboard-links.tsx",
);

describe("mobile inventory fulfillment parity", () => {
	test("uses virtualized infinite lists with refresh, empty, error, and filter states", () => {
		expect(list).toContain("LegendList");
		expect(list).toContain("recycleItems");
		expect(list).toContain("RefreshControl");
		expect(list).toContain("InventoryFulfillmentEmptyState");
		expect(screen).toContain("InventoryFulfillmentFilterSheet");
	});

	test("uses the hardened typed queue and global summary routes", () => {
		expect(backorderQuery).toContain(
			"salesBackorderQueue.infiniteQueryOptions",
		);
		expect(backorderQuery).toContain("salesBackorderQueueSummary.queryOptions");
		expect(partialQuery).toContain(
			"salesPartialShipmentQueue.infiniteQueryOptions",
		);
		expect(partialQuery).toContain(
			"salesPartialShipmentQueueSummary.queryOptions",
		);
	});

	test("keeps hold and shipment actions on typed API mutations with full invalidation", () => {
		expect(actions).toContain(
			"setSalesInventoryLineFulfillmentHold.mutationOptions",
		);
		expect(actions).toContain("shipAvailableSalesInventory.mutationOptions");
		expect(actions).toContain("salesBackorderQueueSummary.queryKey");
		expect(actions).toContain("salesPartialShipmentQueueSummary.queryKey");
	});

	test("exposes both permission-aware workspaces from the sales dashboard", () => {
		expect(dashboard).toContain("canViewInventoryFulfillment");
		expect(dashboard).toContain("/(sales)/inventory/backorders");
		expect(dashboard).toContain("/(sales)/inventory/partial-shipments");
	});
});
