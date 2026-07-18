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

describe("Clean-code sales form moulding lines table migration parity", () => {
	it("keeps the clean-code moulding desktop grid off the embedded raw table", () => {
		const source = readSource(
			"app-deps/(clean-code)/(sales)/sales-book/(form)/_components/moulding-step/index.tsx",
		);

		assertContains(source, "CleanCodeSalesFormMouldingLinesTable");
		assertContains(source, "data={mouldingRows}");
		assertContains(source, "itemType={ctx?.ctx?.getItemType()}");
		assertContains(source, "buildMouldingRows");
		assertNotContains(source, 'from "@gnd/ui/table"');
		assertNotContains(source, "<Table");
		assertNotContains(source, "TableHeader");
		assertNotContains(source, "TableBody");
		assertNotContains(source, "TableRow");
		assertNotContains(source, "TableCell");
		assertNotContains(source, "table-fixed");
	});

	it("keeps table-owned scroll, DnD, resize, and row virtualization", () => {
		const source = readSource(
			"components/tables-2/clean-code-sales-form-moulding-lines/data-table.tsx",
		);

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(
			source,
			'id="clean-code-sales-form-moulding-lines-table-dnd"',
		);
		assertContains(source, "collisionDetection={closestCenter}");
		assertContains(source, "VirtualRow");
		assertContains(source, "rowHeight={tableConfig.rowHeight}");
		assertContains(source, "estimateSize: () => tableConfig.rowHeight");
		assertContains(source, "useTableScroll");
	});

	it("keeps compact editable moulding columns bound to clean-code context", () => {
		const source = readSource(
			"components/tables-2/clean-code-sales-form-moulding-lines/columns.tsx",
		);

		assertContains(source, 'id: "sn"');
		assertContains(source, 'id: "moulding"');
		assertContains(source, 'id: "qty"');
		assertContains(source, 'id: "estimate"');
		assertContains(source, 'id: "addon"');
		assertContains(source, 'id: "total"');
		assertContains(source, 'id: "actions"');
		assertContains(source, "useCtx");
		assertContains(source, "MouldingCalculator");
		assertContains(source, "LineInput");
		assertContains(source, 'name="qty.total"');
		assertContains(source, 'name="pricing.customPrice"');
		assertContains(source, 'name="pricing.addon"');
		assertContains(source, "DataLine");
		assertContains(source, "MoneyBadge");
		assertContains(source, "AnimatedNumber");
		assertContains(source, "ConfirmBtn");
		assertContains(source, "sizes.custom(200, 380, 260)");
	});

	it("registers compact content-fit clean-code moulding table settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"clean-code-sales-form-moulding-lines"');
		assertContains(configSource, '"clean-code-sales-form-moulding-lines": {');
		assertContains(
			configSource,
			'tableId: "clean-code-sales-form-moulding-lines"',
		);
		assertContains(configSource, "rowHeight: 48");
		assertContains(configSource, 'style: "compact"');
		assertContains(
			configSource,
			'nonReorderableColumns: new Set(["sn", "moulding", "actions"])',
		);
	});
});
