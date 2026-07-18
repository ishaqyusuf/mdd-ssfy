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

describe("Community Model Cost form task table migration parity", () => {
	it("keeps the model-cost form off the embedded table-sm grid", () => {
		const source = readSource("components/forms/community-model-cost-form.tsx");

		assertContains(source, "CommunityModelCostFormTasksTable");
		assertContains(source, "data={taskRows}");
		assertContains(source, "control={form.control}");
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
			"components/tables-2/community-model-cost-form-tasks/data-table.tsx",
		);

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(source, 'id="community-model-cost-form-tasks-table-dnd"');
		assertContains(source, "collisionDetection={closestCenter}");
		assertContains(source, "VirtualRow");
		assertContains(source, "rowHeight={tableConfig.rowHeight}");
		assertContains(source, "estimateSize: () => tableConfig.rowHeight");
		assertContains(source, "useTableScroll");
	});

	it("keeps compact editable task/cost/tax columns bound to the model-cost form", () => {
		const source = readSource(
			"components/tables-2/community-model-cost-form-tasks/columns.tsx",
		);

		assertContains(source, 'id: "task"');
		assertContains(source, 'id: "cost"');
		assertContains(source, 'id: "tax"');
		assertContains(source, 'costFieldName("costs", row.original.uid)');
		assertContains(source, 'costFieldName("tax", row.original.uid)');
		assertContains(source, 'placeholder: "$0.00"');
		assertContains(source, "sizes.custom(240, 420, 300)");
		assertContains(source, "sizes.custom(112, 150, 124)");
	});

	it("registers compact content-fit model-cost form table settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"community-model-cost-form-tasks"');
		assertContains(configSource, '"community-model-cost-form-tasks": {');
		assertContains(
			configSource,
			'tableId: "community-model-cost-form-tasks"',
		);
		assertContains(configSource, "rowHeight: 48");
		assertContains(configSource, 'style: "compact"');
		assertContains(configSource, 'nonReorderableColumns: new Set(["task"])');
	});
});
