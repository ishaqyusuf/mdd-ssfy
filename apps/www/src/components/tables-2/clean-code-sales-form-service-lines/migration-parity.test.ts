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

describe("Clean-code sales form service lines table migration parity", () => {
	it("keeps the clean-code service desktop grid off the embedded raw table", () => {
		const source = readSource(
			"app-deps/(clean-code)/(sales)/sales-book/(form)/_components/service-step/index.tsx",
		);

		assertContains(source, "CleanCodeSalesFormServiceLinesTable");
		assertContains(source, "data={serviceRows}");
		assertContains(source, "buildServiceRows");
		assertNotContains(source, 'from "@gnd/ui/table"');
		assertNotContains(source, "<Table");
		assertNotContains(source, "TableHeader");
		assertNotContains(source, "TableBody");
		assertNotContains(source, "TableRow");
		assertNotContains(source, "TableCell");
		assertNotContains(source, "TableFooter");
		assertNotContains(source, "table-fixed");
	});

	it("keeps table-owned scroll, DnD, resize, and row virtualization", () => {
		const source = readSource(
			"components/tables-2/clean-code-sales-form-service-lines/data-table.tsx",
		);

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(
			source,
			'id="clean-code-sales-form-service-lines-table-dnd"',
		);
		assertContains(source, "collisionDetection={closestCenter}");
		assertContains(source, "VirtualRow");
		assertContains(source, "rowHeight={tableConfig.rowHeight}");
		assertContains(source, "estimateSize: () => tableConfig.rowHeight");
		assertContains(source, "useTableScroll");
	});

	it("keeps compact editable service columns bound to clean-code context", () => {
		const source = readSource(
			"components/tables-2/clean-code-sales-form-service-lines/columns.tsx",
		);

		assertContains(source, 'id: "sn"');
		assertContains(source, 'id: "description"');
		assertContains(source, 'id: "tax"');
		assertContains(source, 'id: "production"');
		assertContains(source, 'id: "qty"');
		assertContains(source, 'id: "price"');
		assertContains(source, 'id: "total"');
		assertContains(source, 'id: "actions"');
		assertContains(source, "useCtx");
		assertContains(source, "LineInput");
		assertContains(source, "LineSwitch");
		assertContains(source, 'name="meta.description"');
		assertContains(source, 'name="meta.taxxable"');
		assertContains(source, 'name="meta.produceable"');
		assertContains(source, 'name="qty.total"');
		assertContains(source, 'name="pricing.customPrice"');
		assertContains(source, "AnimatedNumber");
		assertContains(source, "ConfirmBtn");
		assertContains(source, "sizes.custom(220, 420, 280)");
	});

	it("registers compact content-fit clean-code service table settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"clean-code-sales-form-service-lines"');
		assertContains(configSource, '"clean-code-sales-form-service-lines": {');
		assertContains(
			configSource,
			'tableId: "clean-code-sales-form-service-lines"',
		);
		assertContains(configSource, "rowHeight: 48");
		assertContains(configSource, 'style: "compact"');
		assertContains(
			configSource,
			'nonReorderableColumns: new Set(["sn", "description", "actions"])',
		);
	});
});
