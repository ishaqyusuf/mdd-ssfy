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

describe("Inventory product form sub-components table migration parity", () => {
	it("keeps the category sub-components form off the inline table", () => {
		const source = readSource(
			"components/forms/inventory-products/category-sub-components-section.tsx",
		);

		assertContains(source, "InventoryProductFormSubComponentsTable");
		assertContains(source, "data={tableRows}");
		assertContains(source, "categoryOptions={categoryOptions}");
		assertContains(source, "onCategorySelect={handleCategorySelect}");
		assertContains(source, "onToggleStatus={handleUpdateStatus}");
		assertContains(source, "onRemove={removeItem}");
		assertNotContains(source, 'from "@gnd/ui/table"');
		assertNotContains(source, "<Table");
		assertNotContains(source, "TableHeader");
		assertNotContains(source, "TableBody");
		assertNotContains(source, "SortableContext");
	});

	it("keeps table-owned scroll, DnD, resize, and row virtualization", () => {
		const source = readSource(
			"components/tables-2/inventory-product-form-sub-components/data-table.tsx",
		);

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(source, 'id="inventory-product-form-sub-components-table-dnd"');
		assertContains(source, "collisionDetection={closestCenter}");
		assertContains(source, "VirtualRow");
		assertContains(source, "rowHeight={tableConfig.rowHeight}");
		assertContains(source, "estimateSize: () => tableConfig.rowHeight");
		assertContains(source, "useTableScroll");
	});

	it("keeps compact category, default product, status, and action columns", () => {
		const source = readSource(
			"components/tables-2/inventory-product-form-sub-components/columns.tsx",
		);

		assertContains(source, 'id: "handle"');
		assertContains(source, 'id: "category"');
		assertContains(source, 'id: "defaultProduct"');
		assertContains(source, 'id: "status"');
		assertContains(source, 'id: "actions"');
		assertContains(source, "FormCombobox");
		assertContains(source, "ComboxBox");
		assertContains(source, "meta?.onToggleStatus(row.original)");
		assertContains(source, "meta?.onRemove(row.original)");
		assertContains(source, "sizes.custom(220, 360, 260)");
		assertContains(source, "sizes.custom(220, 420, 280)");
	});

	it("registers compact content-fit inventory product form sub-component settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"inventory-product-form-sub-components"');
		assertContains(configSource, '"inventory-product-form-sub-components": {');
		assertContains(
			configSource,
			'tableId: "inventory-product-form-sub-components"',
		);
		assertContains(configSource, "rowHeight: 52");
		assertContains(configSource, 'style: "compact"');
		assertContains(
			configSource,
			'nonReorderableColumns: new Set(["handle", "category", "actions"])',
		);
	});
});
