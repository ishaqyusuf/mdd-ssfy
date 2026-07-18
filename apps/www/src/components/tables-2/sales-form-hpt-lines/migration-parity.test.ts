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

describe("Sales form HPT lines table migration parity", () => {
	it("keeps the HPT desktop grid off the embedded raw table", () => {
		const source = readSource(
			"components/forms/sales-form/hpt/hpt-section.tsx",
		);
		const noteSource = readSource(
			"components/forms/sales-form/hpt/hpt-note.tsx",
		);

		assertContains(source, "SalesFormHptLinesTable");
		assertContains(source, "data={hptRows}");
		assertContains(source, "isSlab={isSlab}");
		assertContains(source, "showSwing={showSwingColumn}");
		assertContains(source, "noHandle={Boolean(ctx.config.noHandle)}");
		assertContains(source, "HptNotesPanel");
		assertNotContains(source, 'from "@gnd/ui/table"');
		assertNotContains(source, "<Table");
		assertNotContains(source, "TableHeader");
		assertNotContains(source, "TableBody");
		assertNotContains(source, "TableRow");
		assertNotContains(source, "TableCell");
		assertNotContains(source, "table-sm");
		assertNotContains(noteSource, 'from "@gnd/ui/table"');
		assertNotContains(noteSource, "<TableRow");
		assertNotContains(noteSource, "<TableCell");
	});

	it("keeps table-owned scroll, DnD, resize, virtualization, and mode visibility", () => {
		const source = readSource(
			"components/tables-2/sales-form-hpt-lines/data-table.tsx",
		);

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(source, 'id="sales-form-hpt-lines-table-dnd"');
		assertContains(source, "collisionDetection={closestCenter}");
		assertContains(source, "VirtualRow");
		assertContains(source, "rowHeight={tableConfig.rowHeight}");
		assertContains(source, "estimateSize: () => tableConfig.rowHeight");
		assertContains(source, "useTableScroll");
		assertContains(source, "production: isSlab");
		assertContains(source, "swing: showSwing");
		assertContains(source, "qty: noHandle");
		assertContains(source, "lh: !noHandle");
		assertContains(source, "rh: !noHandle");
	});

	it("keeps compact editable HPT columns bound to HPT line context", () => {
		const source = readSource(
			"components/tables-2/sales-form-hpt-lines/columns.tsx",
		);

		assertContains(source, 'id: "sn"');
		assertContains(source, 'id: "size"');
		assertContains(source, 'id: "production"');
		assertContains(source, 'id: "swing"');
		assertContains(source, 'id: "qty"');
		assertContains(source, 'id: "lh"');
		assertContains(source, 'id: "rh"');
		assertContains(source, 'id: "estimate"');
		assertContains(source, 'id: "total"');
		assertContains(source, 'id: "actions"');
		assertContains(source, "HptLineContextProvider");
		assertContains(source, "lineUid: row.lineUid");
		assertContains(source, 'name="prodOverride.production"');
		assertContains(source, 'name="swing"');
		assertContains(source, 'name="qty.total"');
		assertContains(source, 'name="qty.lh"');
		assertContains(source, 'name="qty.rh"');
		assertContains(source, "PriceEstimateCell");
		assertContains(source, "AnimatedNumber");
		assertContains(source, "ConfirmBtn");
		assertContains(source, "Icons.Notebook");
		assertContains(source, "sizes.custom(112, 190, 132)");
		assertContains(source, "sizes.custom(84, 120, 96)");
	});

	it("registers compact content-fit HPT line table settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"sales-form-hpt-lines"');
		assertContains(configSource, '"sales-form-hpt-lines": {');
		assertContains(configSource, 'tableId: "sales-form-hpt-lines"');
		assertContains(configSource, "rowHeight: 48");
		assertContains(configSource, 'style: "compact"');
		assertContains(
			configSource,
			'nonReorderableColumns: new Set(["sn", "size", "actions"])',
		);
	});
});
