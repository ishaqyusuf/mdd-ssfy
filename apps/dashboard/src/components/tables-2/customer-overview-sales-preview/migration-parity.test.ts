import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Customer Overview sales preview table migration parity", () => {
	it("keeps the customer overview route on the restarted shell without manual fetchQuery", () => {
		const source = readSource(
			"app/(sidebar)/(sales)/sales-book/customers/v2/[accountNo]/page.tsx",
		);
		const normalizedSource = source.replace(/\s+/g, "");

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(
			source.includes("trpc.customers.getCustomerOverviewV2.queryOptions"),
		).toBe(true);
		expect(
			normalizedSource.includes(
				'getInitialTableSettings("customer-overview-sales-preview"',
			),
		).toBe(true);
		expect(
			source.includes("customerOverviewSalesPreviewInitialSettings={"),
		).toBe(true);
		expect(source.includes("getQueryClient")).toBe(false);
		expect(source.includes("fetchQuery")).toBe(false);
	});

	it("replaces the raw customer sales/quotes preview table with the restarted table", () => {
		const source = readSource(
			"components/customer-v2/customer-overview-v2-content.tsx",
		);

		expect(source.includes("CustomerOverviewSalesPreviewTable")).toBe(true);
		expect(source.includes("customerOverviewSalesPreviewInitialSettings")).toBe(
			true,
		);
		expect(source.includes("<table")).toBe(false);
		expect(source.includes("<thead")).toBe(false);
		expect(source.includes("<tbody")).toBe(false);
		expect(source.includes("list.map((item)")).toBe(false);
		expect(source.includes("onOpen={onOpen}")).toBe(true);
		expect(source.includes("onOpenPage")).toBe(false);
		expect(source.includes("onOpenSheet")).toBe(false);
		expect(source.includes("isLoading={isPending}")).toBe(true);
	});

	it("keeps table-owned scroll, DnD, resize, and row-open behavior", () => {
		const source = readSource(
			"components/tables-2/customer-overview-sales-preview/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(
			source.includes('id="customer-overview-sales-preview-table-dnd"'),
		).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("startFromColumn: 1")).toBe(true);
		expect(source.includes("onOpen(row.original.uuid)")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
	});

	it("keeps compact headers, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/customer-overview-sales-preview/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("HorizontalPagination")).toBe(true);
		expect(source.includes("getTableCellPaddingClass(tableConfig.style)")).toBe(
			true,
		);
		expect(source.includes("ResizeHandle")).toBe(true);
		expect(source.includes('columnId !== "reference"')).toBe(true);
	});

	it("registers compact tailored preview widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/customer-overview-sales-preview/columns.tsx",
		);

		expect(settingsSource.includes('| "customer-overview-sales-preview"')).toBe(
			true,
		);
		expect(configSource.includes('"customer-overview-sales-preview": {')).toBe(
			true,
		);
		expect(
			configSource.includes('tableId: "customer-overview-sales-preview"'),
		).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(configSource.includes('new Set(["reference", "actions"])')).toBe(
			true,
		);
		expect(columnsSource.includes("sizes.custom(150, 260, 180)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 120)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(118, 180, 132)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(168, 230, 190)")).toBe(true);
		expect(columnsSource.includes("md:sticky md:left-0")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
		expect(columnsSource.includes("onOpen(row.original.uuid)")).toBe(true);
		expect(columnsSource.includes("onOpenPage")).toBe(false);
	});
});
