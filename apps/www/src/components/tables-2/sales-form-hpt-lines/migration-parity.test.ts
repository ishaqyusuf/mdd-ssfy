import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

const legacyTableAdapters = [
	"components/tables-2/sales-form-hpt-lines/data-table.tsx",
	"components/tables-2/sales-form-takeoff-hpt-lines/data-table.tsx",
	"components/tables-2/sales-form-shelf-items/data-table.tsx",
	"components/tables-2/sales-form-moulding-lines/data-table.tsx",
	"components/tables-2/sales-form-service-lines/data-table.tsx",
	"components/tables-2/clean-code-door-size-select-lines/data-table.tsx",
	"components/tables-2/clean-code-sales-form-moulding-lines/data-table.tsx",
	"components/tables-2/clean-code-sales-form-service-lines/data-table.tsx",
	"components/tables-2/door-suppliers/data-table.tsx",
];

describe("legacy sales-form table style compatibility", () => {
	it("renders form grids with the established semantic table layout", () => {
		const source = readSource(
			"components/forms/sales-form/legacy-form-data-table.tsx",
		);

		assert.match(source, /<Table/);
		assert.match(source, /<TableHeader/);
		assert.match(source, /<TableBody/);
		assert.match(source, /<TableRow/);
		assert.match(source, /<TableCell/);
		assert.match(source, /table-fixed p-4 text-xs font-medium/);
		assert.match(source, /getLegacyColumnStyle/);
		assert.match(source, /contentClassName/);
		assert.doesNotMatch(source, /DndContext|VirtualRow|useVirtualizer/);
		assert.doesNotMatch(source, /useTableSettings|useTableScroll/);
	});

	it("keeps every sales-form editor outside restarted table behavior", () => {
		for (const path of legacyTableAdapters) {
			const source = readSource(path);

			assert.match(
				source,
				/LegacyFormDataTable/,
				`${path} must use the legacy form table`,
			);
			assert.doesNotMatch(source, /DndContext|VirtualRow|useVirtualizer/);
			assert.doesNotMatch(source, /useTableSettings|useTableScroll/);
		}
	});

	it("preserves conditional door columns and editor callbacks", () => {
		const hptSource = readSource(legacyTableAdapters[0]);
		const takeoffSource = readSource(legacyTableAdapters[1]);
		const sizeSelectSource = readSource(legacyTableAdapters[5]);
		const supplierSource = readSource(legacyTableAdapters[8]);
		const sizeSelectModalSource = readSource(
			"app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/index.tsx",
		);

		for (const source of [hptSource, takeoffSource, sizeSelectSource]) {
			assert.match(source, /swing: showSwing/);
			assert.match(source, /qty: noHandle/);
			assert.match(source, /lh: !noHandle/);
			assert.match(source, /rh: !noHandle/);
		}

		assert.match(supplierSource, /selectedSupplierUid/);
		assert.match(supplierSource, /onRowClick=\{onSelect\}/);
		assert.match(supplierSource, /onSelect/);
		assert.match(supplierSource, /onEdit/);
		assert.match(supplierSource, /onDelete/);
		assert.match(sizeSelectModalSource, /max-h-\[50vh\] overflow-auto/);
	});
});
