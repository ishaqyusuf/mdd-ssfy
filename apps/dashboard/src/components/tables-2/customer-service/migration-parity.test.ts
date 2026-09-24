import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("apps/dashboard/src");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

function expectIncludes(source: string, value: string) {
	expect(source.includes(value)).toBe(true);
}

function expectExcludes(source: string, value: string) {
	expect(source.includes(value)).toBe(false);
}

describe("Customer Services Sales Orders table migration parity", () => {
	it("uses one Customer Service scroll area for analytics, toolbar, and table", () => {
		const source = readSource(
			"app/(sidebar)/community/customer-services/page.tsx",
		);

		expectIncludes(source, "CustomerServiceScrollArea");
		expectIncludes(source, "<PageTitle>Customer Service</PageTitle>");
		expectIncludes(source, "<CustomerServiceHeader />");
		expectIncludes(source, "<DataTable initialSettings={initialSettings} />");
		expectIncludes(source, "batchPrefetch([");
		expectIncludes(source, "loadSortParams");
		expectExcludes(source, "PageStickyHeader");
		expectExcludes(source, "fetchInfiniteQuery");
	});

	it("keeps table-core drag, selection, virtualization, and bottom-bar behavior", () => {
		const source = readSource(
			"components/tables-2/customer-service/data-table.tsx",
		);

		expectExcludes(source, "useScrollHeader(parentRef)");
		expectIncludes(source, "useCustomerServiceScrollArea()");
		expectIncludes(source, "scrollMargin");
		expectIncludes(source, "useTableDnd(table)");
		expectIncludes(source, "<DndContext");
		expectIncludes(source, 'id="customer-service-table-dnd"');
		expectIncludes(source, "collisionDetection={closestCenter}");
		expectExcludes(source, 'height: "var(--header-offset, 0px)"');
		expectIncludes(source, "rowHeight={tableConfig.rowHeight}");
		expectIncludes(source, "estimateSize: () => tableConfig.rowHeight");
		expectIncludes(source, "onRowSelectionChange: setRowSelection");
		expectIncludes(source, "<AnimatePresence>");
		expectIncludes(source, "<BottomBar data={tableData} />");
	});

	it("keeps header drag sorting, select-all, action header, and resize behavior", () => {
		const source = readSource(
			"components/tables-2/customer-service/table-header.tsx",
		);

		expectIncludes(source, "SortableContext");
		expectIncludes(source, "horizontalListSortingStrategy");
		expectIncludes(source, "DraggableHeader");
		expectIncludes(source, "useSortQuery");
		expectIncludes(source, "SortButton");
		expectIncludes(source, "table.toggleAllPageRowsSelected");
		expectIncludes(source, "Actions");
		expectIncludes(source, "tableConfig.nonReorderableColumns");
		expectIncludes(source, "ResizeHandle");
	});

	it("keeps Customer Services compact row height and content-fit widths configured", () => {
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/customer-service/columns.tsx",
		);

		expectIncludes(configSource, '"customer-service": {');
		expectIncludes(configSource, 'tableId: "customer-service"');
		expectIncludes(
			configSource,
			'{ id: "appointment", width: sizes.custom(132, 210, 154).size }',
		);
		expectIncludes(configSource, "rowHeight: 56");
		expectIncludes(columnsSource, "...sizes.custom(132, 210, 154)");
		expectIncludes(columnsSource, "...sizes.custom(160, 280, 190)");
		expectIncludes(columnsSource, "...sizes.custom(220, 420, 260)");
		expectIncludes(columnsSource, "...sizes.custom(140, 220, 160)");
		expectIncludes(columnsSource, "...sizes.custom(112, 170, 128)");
		expectIncludes(columnsSource, 'className="h-9 min-w-0');
	});
});
