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
	assert.ok(
		!source.includes(search),
		`Expected source not to contain: ${search}`,
	);
}

describe("Sales form shelf items table migration parity", () => {
	it("keeps the shelf-items desktop grid off the embedded raw table", () => {
		const source = readSource("components/forms/sales-form/shelf-items.tsx");

		assertContains(source, "SalesFormShelfItemsTable");
		assertContains(source, "data={shelfRows}");
		assertContains(source, "buildShelfRows");
		assertNotContains(source, 'from "@gnd/ui/table"');
		assertNotContains(source, "<Table");
		assertNotContains(source, "TableHeader");
		assertNotContains(source, "TableBody");
		assertNotContains(source, "TableRow");
		assertNotContains(source, "TableCell");
		assertNotContains(source, "table-sm");
	});

	it("keeps table-owned scroll, DnD, resize, and row virtualization", () => {
		const source = readSource(
			"components/tables-2/sales-form-shelf-items/data-table.tsx",
		);

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(source, 'id="sales-form-shelf-items-table-dnd"');
		assertContains(source, "collisionDetection={closestCenter}");
		assertContains(source, "VirtualRow");
		assertContains(source, "rowHeight={tableConfig.rowHeight}");
		assertContains(source, "estimateSize: () => tableConfig.rowHeight");
		assertContains(source, "useTableScroll");
	});

	it("keeps compact editable shelf columns bound to shelf item context", () => {
		const source = readSource(
			"components/tables-2/sales-form-shelf-items/columns.tsx",
		);

		assertContains(source, 'id: "sn"');
		assertContains(source, 'id: "category"');
		assertContains(source, 'id: "product"');
		assertContains(source, 'id: "price"');
		assertContains(source, 'id: "qty"');
		assertContains(source, 'id: "total"');
		assertContains(source, 'id: "actions"');
		assertContains(source, "ShelfItemContext.Provider");
		assertContains(source, "useShelfItemContext");
		assertContains(source, "ShelfItemCategoryInput");
		assertContains(source, "ProductPickerCell");
		assertContains(source, "ShelfPriceCell");
		assertContains(source, "ShelfQtyInput");
		assertContains(source, "AnimatedNumber");
		assertContains(source, "ConfirmBtn");
		assertContains(source, "AddProductCell");
		assertContains(source, "sizes.custom(210, 360, 260)");
		assertContains(source, "sizes.custom(240, 420, 300)");
	});

	it("registers compact content-fit shelf item table settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"sales-form-shelf-items"');
		assertContains(configSource, '"sales-form-shelf-items": {');
		assertContains(configSource, 'tableId: "sales-form-shelf-items"');
		assertContains(configSource, "rowHeight: 56");
		assertContains(configSource, 'style: "compact"');
		assertContains(
			configSource,
			'nonReorderableColumns: new Set(["sn", "category", "actions"])',
		);
	});
});
