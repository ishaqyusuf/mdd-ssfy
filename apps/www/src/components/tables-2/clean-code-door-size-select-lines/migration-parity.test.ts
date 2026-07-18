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

describe("Clean-code door size select lines table migration parity", () => {
	it("keeps the door-size select modal off the embedded raw table", () => {
		const source = readSource(
			"app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/index.tsx",
		);

		assertContains(source, "CleanCodeDoorSizeSelectLinesTable");
		assertContains(source, "buildCleanCodeDoorSizeSelectRows");
		assertContains(source, "showSwing={Boolean(config.hasSwing)}");
		assertContains(source, "noHandle={Boolean(config.noHandle)}");
		assertNotContains(source, 'from "@gnd/ui/table"');
		assertNotContains(source, "<Table");
		assertNotContains(source, "TableHeader");
		assertNotContains(source, "TableBody");
		assertNotContains(source, "TableRow");
		assertNotContains(source, "TableCell");
	});

	it("keeps table-owned scroll, DnD, resize, virtualization, and mode visibility", () => {
		const source = readSource(
			"components/tables-2/clean-code-door-size-select-lines/data-table.tsx",
		);

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(source, 'id="clean-code-door-size-select-lines-table-dnd"');
		assertContains(source, "collisionDetection={closestCenter}");
		assertContains(source, "VirtualRow");
		assertContains(source, "rowHeight={tableConfig.rowHeight}");
		assertContains(source, "estimateSize: () => tableConfig.rowHeight");
		assertContains(source, "useTableScroll");
		assertContains(source, "swing: showSwing");
		assertContains(source, "qty: noHandle");
		assertContains(source, "lh: !noHandle");
		assertContains(source, "rh: !noHandle");
	});

	it("keeps compact editable door-size columns bound to clean-code context", () => {
		const source = readSource(
			"components/tables-2/clean-code-door-size-select-lines/columns.tsx",
		);

		assertContains(source, 'id: "size"');
		assertContains(source, 'id: "price"');
		assertContains(source, 'id: "swing"');
		assertContains(source, 'id: "qty"');
		assertContains(source, 'id: "lh"');
		assertContains(source, 'id: "rh"');
		assertContains(source, "useCtx");
		assertContains(source, "AuthGuard");
		assertContains(source, "PricePopover");
		assertContains(source, "PriceControl");
		assertContains(source, "FormSelect");
		assertContains(source, "FormInput");
		assertContains(source, "doorSwings");
		assertContains(source, 'name="qty.total"');
		assertContains(source, 'name="qty.lh"');
		assertContains(source, 'name="qty.rh"');
		assertContains(source, "name={`selections.${row.variant.path}.${name}`}");
		assertContains(source, "sizes.custom(116, 190, 136)");
		assertContains(source, "sizes.custom(84, 118, 94)");
	});

	it("registers compact content-fit door-size select table settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"clean-code-door-size-select-lines"');
		assertContains(configSource, '"clean-code-door-size-select-lines": {');
		assertContains(
			configSource,
			'tableId: "clean-code-door-size-select-lines"',
		);
		assertContains(configSource, "rowHeight: 52");
		assertContains(configSource, 'style: "compact"');
		assertContains(
			configSource,
			'nonReorderableColumns: new Set(["size", "qty", "rh"])',
		);
	});
});
