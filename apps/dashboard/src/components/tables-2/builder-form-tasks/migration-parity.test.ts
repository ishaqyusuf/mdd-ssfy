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

describe("Builder form task table migration parity", () => {
	it("keeps the builder form off the namespace/embedded table grid", () => {
		const source = readSource("components/builder-form.tsx");

		assertContains(source, "BuilderFormTasksTable");
		assertContains(source, "data={taskRows}");
		assertContains(source, "control={form.control}");
		assertContains(source, "onRemoveTask={remove}");
		assertContains(source, "fieldId: field._id");
		assertNotContains(source, 'from "@gnd/ui/namespace"');
		assertNotContains(source, "<Table");
		assertNotContains(source, "<Table.Header");
		assertNotContains(source, "<Table.Body");
		assertNotContains(source, "<Table.Row");
		assertNotContains(source, "<Table.Cell");
		assertNotContains(source, "table-sm");
	});

	it("keeps table-owned scroll, DnD, resize, and row virtualization", () => {
		const source = readSource(
			"components/tables-2/builder-form-tasks/data-table.tsx",
		);

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(source, 'id="builder-form-tasks-table-dnd"');
		assertContains(source, "collisionDetection={closestCenter}");
		assertContains(source, "VirtualRow");
		assertContains(source, "rowHeight={tableConfig.rowHeight}");
		assertContains(source, "estimateSize: () => tableConfig.rowHeight");
		assertContains(source, "useTableScroll");
	});

	it("keeps compact editable task, flags, and delete columns bound to the form", () => {
		const source = readSource(
			"components/tables-2/builder-form-tasks/columns.tsx",
		);

		assertContains(source, 'id: "task"');
		assertContains(source, 'id: "addon"');
		assertContains(source, 'id: "billable"');
		assertContains(source, 'id: "installable"');
		assertContains(source, 'id: "productionable"');
		assertContains(source, 'id: "actions"');
		assertContains(source, 'taskFieldName(row.original.index, "taskName")');
		assertContains(
			source,
			'taskFieldName(row.original.index, "addonPercentage")',
		);
		assertContains(source, "meta?.onRemoveTask(row.original.index)");
		assertContains(source, "sizes.custom(220, 420, 280)");
		assertContains(source, "sizes.custom(96, 132, 108)");
	});

	it("registers compact content-fit builder form task table settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"builder-form-tasks"');
		assertContains(configSource, '"builder-form-tasks": {');
		assertContains(configSource, 'tableId: "builder-form-tasks"');
		assertContains(configSource, "rowHeight: 48");
		assertContains(configSource, 'style: "compact"');
		assertContains(
			configSource,
			'nonReorderableColumns: new Set(["task", "actions"])',
		);
	});
});
