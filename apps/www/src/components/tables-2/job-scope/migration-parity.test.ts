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

describe("Job scope table migration parity", () => {
	it("keeps the job overview scope off the namespace table", () => {
		const source = readSource("components/modals/job-overview/job-scope.tsx");

		assertContains(source, "JobScopeTable");
		assertContains(source, "data={taskRows}");
		assertNotContains(
			source,
			'import { Card, Table } from "@gnd/ui/namespace"',
		);
		assertNotContains(source, "<Table");
		assertNotContains(source, "Table.Header");
		assertNotContains(source, "Table.Body");
		assertNotContains(source, "Table.Row");
		assertNotContains(source, "Table.Cell");
	});

	it("keeps table-owned scroll, DnD, resize, and row virtualization", () => {
		const source = readSource("components/tables-2/job-scope/data-table.tsx");

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(source, 'id="job-scope-table-dnd"');
		assertContains(source, "collisionDetection={closestCenter}");
		assertContains(source, "VirtualRow");
		assertContains(source, "rowHeight={tableConfig.rowHeight}");
		assertContains(source, "estimateSize: () => tableConfig.rowHeight");
		assertContains(source, "useTableScroll");
	});

	it("keeps compact task, rate, qty, and total columns", () => {
		const source = readSource("components/tables-2/job-scope/columns.tsx");

		assertContains(source, 'id: "task"');
		assertContains(source, 'id: "rate"');
		assertContains(source, 'id: "qty"');
		assertContains(source, 'id: "total"');
		assertContains(source, "row.original.maxQty");
		assertContains(source, "sizes.custom(220, 420, 280)");
		assertContains(source, "sizes.custom(84, 124, 96)");
		assertContains(source, "sizes.custom(84, 118, 94)");
		assertContains(source, "sizes.custom(92, 132, 104)");
	});

	it("registers compact content-fit job scope table settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"job-scope"');
		assertContains(configSource, '"job-scope": {');
		assertContains(configSource, 'tableId: "job-scope"');
		assertContains(configSource, "rowHeight: 48");
		assertContains(configSource, 'style: "compact"');
		assertContains(configSource, 'nonReorderableColumns: new Set(["task"])');
	});
});
