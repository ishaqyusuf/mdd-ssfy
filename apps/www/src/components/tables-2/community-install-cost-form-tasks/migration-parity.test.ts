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

describe("Community Install Cost form task table migration parity", () => {
	it("keeps the install-cost form off the embedded table-sm grid", () => {
		const source = readSource("components/forms/community-install-cost-form.tsx");

		assertContains(source, "CommunityInstallCostFormTasksTable");
		assertContains(source, "data={taskRows}");
		assertContains(source, "control={form.control}");
		assertContains(source, "activeTaskUids={activeTaskUids}");
		assertNotContains(source, 'from "@gnd/ui/table"');
		assertNotContains(source, "table-sm");
		assertNotContains(source, "TCell");
		assertNotContains(source, "<Table");
		assertNotContains(source, "<TableHeader");
		assertNotContains(source, "<TableBody");
		assertNotContains(source, "<TableRow");
		assertNotContains(source, "<TableCell");
	});

	it("keeps table-owned scroll, DnD, resize, and row virtualization", () => {
		const source = readSource(
			"components/tables-2/community-install-cost-form-tasks/data-table.tsx",
		);

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(source, 'id="community-install-cost-form-tasks-table-dnd"');
		assertContains(source, "collisionDetection={closestCenter}");
		assertContains(source, "VirtualRow");
		assertContains(source, "rowHeight={tableConfig.rowHeight}");
		assertContains(source, "estimateSize: () => tableConfig.rowHeight");
		assertContains(source, "useTableScroll");
		assertContains(source, "isSelected={isActive}");
	});

	it("keeps compact editable task/default-quantity/quantity columns bound to the form", () => {
		const source = readSource(
			"components/tables-2/community-install-cost-form-tasks/columns.tsx",
		);

		assertContains(source, 'id: "task"');
		assertContains(source, 'id: "defaultQty"');
		assertContains(source, 'id: "quantity"');
		assertContains(source, "formatMoney(row.original.cost)");
		assertContains(source, "row.original.defaultQty");
		assertContains(source, "installCostFieldName(row.original.uid)");
		assertContains(source, 'placeholder="0"');
		assertContains(source, "sizes.custom(240, 420, 300)");
		assertContains(source, "sizes.custom(88, 120, 96)");
	});

	it("registers compact content-fit install-cost form table settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"community-install-cost-form-tasks"');
		assertContains(configSource, '"community-install-cost-form-tasks": {');
		assertContains(
			configSource,
			'tableId: "community-install-cost-form-tasks"',
		);
		assertContains(configSource, "rowHeight: 48");
		assertContains(configSource, 'style: "compact"');
		assertContains(configSource, 'nonReorderableColumns: new Set(["task"])');
	});
});
