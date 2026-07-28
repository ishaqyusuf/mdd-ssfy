import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

function assertContains(source: string, search: string) {
	assert.ok(source.includes(search), `Expected source to contain: ${search}`);
}

function assertNotContains(source: string, search: string) {
	assert.ok(!source.includes(search), `Expected source not to contain: ${search}`);
}

describe("Inventory product form variant table migration parity", () => {
	it("keeps the product variant form off the inline table and window-scroll loader", () => {
		const source = readSource(
			"components/forms/inventory-products/product-variants.tsx",
		);

		assertContains(source, "InventoryProductFormVariantsTable");
		assertContains(source, "data={ctx.filteredData}");
		assertContains(source, "stockMonitor={product.stockMonitor}");
		assertContains(source, "selectedVariantUid={editVariantUid}");
		assertContains(source, "VariantDetailPanel");
		assertNotContains(source, 'from "@gnd/ui/table"');
		assertNotContains(source, "<Table");
		assertNotContains(source, "TableHeader");
		assertNotContains(source, "scrolledPast");
		assertNotContains(source, "IntersectionObserver");
		assertNotContains(source, "Show More Variants");
	});

	it("keeps table-owned scroll, DnD, resize, and row virtualization", () => {
		const source = readSource(
			"components/tables-2/inventory-product-form-variants/data-table.tsx",
		);

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(source, 'id="inventory-product-form-variants-table-dnd"');
		assertContains(source, "collisionDetection={closestCenter}");
		assertContains(source, "VirtualRow");
		assertContains(source, "rowHeight={tableConfig.rowHeight}");
		assertContains(source, "estimateSize: () => tableConfig.rowHeight");
		assertContains(source, "useTableScroll");
	});

	it("keeps compact variant, cost, stock, status, and action columns", () => {
		const source = readSource(
			"components/tables-2/inventory-product-form-variants/columns.tsx",
		);

		assertContains(source, 'id: "variant"');
		assertContains(source, 'id: "cost"');
		assertContains(source, 'id: "stock"');
		assertContains(source, 'id: "lowStock"');
		assertContains(source, 'id: "status"');
		assertContains(source, 'id: "actions"');
		assertContains(source, "getInventoryProductFormVariantColumns(stockMonitor");
		assertContains(source, "meta?.onStatusChange(row.original, status)");
		assertContains(source, "sizes.custom(220, 420, 280)");
		assertContains(source, "sizes.custom(104, 144, 118)");
	});

	it("registers compact content-fit inventory product form variant settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"inventory-product-form-variants"');
		assertContains(configSource, '"inventory-product-form-variants": {');
		assertContains(configSource, 'tableId: "inventory-product-form-variants"');
		assertContains(configSource, "rowHeight: 52");
		assertContains(configSource, 'style: "compact"');
		assertContains(
			configSource,
			'nonReorderableColumns: new Set(["variant", "actions"])',
		);
	});
});
