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

describe("Employee form permissions table migration parity", () => {
	it("keeps the employee form modal off the inline permission table", () => {
		const source = readSource("components/modals/employee-form-modal.tsx");

		assertContains(source, "EmployeeFormPermissionsTable");
		assertContains(source, "data={permissionRows}");
		assertContains(source, "selectedPermissionIds={selectedPermissionIds}");
		assertContains(source, "onTogglePermission={togglePermission}");
		assertNotContains(source, 'from "@gnd/ui/table"');
		assertNotContains(source, "<Table");
		assertNotContains(source, "TableHeader");
		assertNotContains(source, "TableBody");
		assertNotContains(source, "TableRow");
		assertNotContains(source, "TableCell");
		assertNotContains(source, "ScrollArea");
	});

	it("keeps table-owned scroll, DnD, resize, and row virtualization", () => {
		const source = readSource(
			"components/tables-2/employee-form-permissions/data-table.tsx",
		);

		assertContains(source, "useScrollHeader(parentRef)");
		assertContains(source, "useTableDnd(table)");
		assertContains(source, "<DndContext");
		assertContains(source, 'id="employee-form-permissions-table-dnd"');
		assertContains(source, "collisionDetection={closestCenter}");
		assertContains(source, "VirtualRow");
		assertContains(source, "rowHeight={tableConfig.rowHeight}");
		assertContains(source, "estimateSize: () => tableConfig.rowHeight");
		assertContains(source, "useTableScroll");
	});

	it("keeps compact permission and checkbox columns bound to permission ids", () => {
		const source = readSource(
			"components/tables-2/employee-form-permissions/columns.tsx",
		);

		assertContains(source, 'id: "permission"');
		assertContains(source, 'id: "create"');
		assertContains(source, 'id: "edit"');
		assertContains(source, "selectedPermissionIds.includes(permissionId)");
		assertContains(source, "onTogglePermission(permissionId, checked)");
		assertContains(source, "row.original.viewPermissionId");
		assertContains(source, "row.original.editPermissionId");
		assertContains(source, "sizes.custom(240, 420, 300)");
		assertContains(source, "sizes.custom(84, 112, 92)");
	});

	it("registers compact content-fit employee form permission settings", () => {
		const configSource = readSource("utils/table-configs.ts");
		const settingsSource = readSource("utils/table-settings.ts");

		assertContains(settingsSource, '"employee-form-permissions"');
		assertContains(configSource, '"employee-form-permissions": {');
		assertContains(configSource, 'tableId: "employee-form-permissions"');
		assertContains(configSource, "rowHeight: 48");
		assertContains(configSource, 'style: "compact"');
		assertContains(
			configSource,
			'nonReorderableColumns: new Set(["permission"])',
		);
	});
});
