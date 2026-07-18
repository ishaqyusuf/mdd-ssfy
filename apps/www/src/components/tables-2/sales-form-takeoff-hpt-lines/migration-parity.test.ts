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

describe("Sales form take-off HPT lines table migration parity", () => {
	it("keeps the take-off HPT form off the inline raw table", () => {
		const source = readSource(
			"components/forms/sales-form/take-off/hpt-form.tsx",
		);

		assertContains(source, "SalesFormTakeoffHptLinesTable");
		assertContains(source, "data={hptRows}");
		assertContains(source, "showSwing={Boolean(ctx.config.hasSwing)}");
		assertContains(source, "noHandle={Boolean(ctx.config.noHandle)}");
		assertNotContains(source, "<table");
		assertNotContains(source, "<thead");
		assertNotContains(source, "<tbody");
		assertNotContains(source, "<tr");
		assertNotContains(source, "<td");
		assertNotContains(source, "<th");
	});

	it("keeps table-owned scroll, DnD, resize, virtualization, and mode visibility", () => {
		const source = readSource(
			"components/tables-2/sales-form-takeoff-hpt-lines/data-table.tsx",
		);

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(source, 'id="sales-form-takeoff-hpt-lines-table-dnd"');
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

	it("keeps compact editable take-off HPT columns bound to HPT context", () => {
		const source = readSource(
			"components/tables-2/sales-form-takeoff-hpt-lines/columns.tsx",
		);

		assertContains(source, 'id: "size"');
		assertContains(source, 'id: "swing"');
		assertContains(source, 'id: "qty"');
		assertContains(source, 'id: "lh"');
		assertContains(source, 'id: "rh"');
		assertContains(source, 'id: "estimate"');
		assertContains(source, 'id: "labor"');
		assertContains(source, 'id: "total"');
		assertContains(source, "DoorSizeSelect");
		assertContains(source, "DoorSwingSelect");
		assertContains(source, 'DoorQtyInput name="total" suffix="QTY"');
		assertContains(source, 'DoorQtyInput name="lh" suffix="LH"');
		assertContains(source, 'DoorQtyInput name="rh" suffix="RH"');
		assertContains(source, "PriceEstimateCell");
		assertContains(source, "WageInput");
		assertContains(source, "AnimatedNumber");
		assertContains(source, "sizes.custom(128, 220, 150)");
		assertContains(source, "sizes.custom(84, 118, 94)");
	});

	it("registers compact content-fit take-off HPT table settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"sales-form-takeoff-hpt-lines"');
		assertContains(configSource, '"sales-form-takeoff-hpt-lines": {');
		assertContains(configSource, 'tableId: "sales-form-takeoff-hpt-lines"');
		assertContains(configSource, "rowHeight: 52");
		assertContains(configSource, 'style: "compact"');
		assertContains(
			configSource,
			'nonReorderableColumns: new Set(["size", "total"])',
		);
	});
});
