import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Book navigation", () => {
	it("keeps the shared sales section tabs unmounted", () => {
		const layoutSource = readSource(
			"app/(sidebar)/(sales)/sales-book/layout.tsx",
		);
		const ordersHeaderSource = readSource(
			"components/sales-orders-v2-header.tsx",
		);

		assert.ok(layoutSource.includes("<SalesNav />"));
		assert.ok(!layoutSource.includes("SalesTabs"));
		assert.ok(!ordersHeaderSource.includes("SalesTabs"));
		assert.ok(!ordersHeaderSource.includes("afterSearch="));
		assert.equal(
			existsSync(resolve(root, "components/sales-tabs.tsx")),
			false,
		);
	});

	it("keeps saved filter tabs while removing the obsolete scroll state", () => {
		const ordersHeaderSource = readSource(
			"components/sales-orders-v2-header.tsx",
		);
		const ordersTableSource = readSource(
			"components/tables-2/sales-orders/data-table.tsx",
		);
		const ordersStoreSource = readSource("store/sales-orders.ts");

		assert.ok(ordersHeaderSource.includes('pageTabsLayout="adaptive"'));
		assert.ok(!ordersHeaderSource.includes("isTableScrolled"));
		assert.ok(!ordersTableSource.includes("setIsTableScrolled"));
		assert.ok(!ordersStoreSource.includes("isTableScrolled"));
		assert.ok(!ordersStoreSource.includes("setIsTableScrolled"));
	});

	it("keeps every former sales tab destination in the sidebar", () => {
		const sidebarSource = readSource("components/sidebar-links.ts");
		const destinations = [
			"/sales-book/orders",
			"/sales-book/quotes",
			"/sales-book/productions/v2",
			"/sales-book/shelf-items",
			"/sales-book/inbounds",
			"/sales-book/emails",
		];

		for (const destination of destinations) {
			assert.ok(sidebarSource.includes(`"${destination}"`));
		}
	});
});
