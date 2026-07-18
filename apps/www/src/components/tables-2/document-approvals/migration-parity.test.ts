import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Document Approvals Sales Orders table migration parity", () => {
	it("keeps the route on the restarted table shell", () => {
		const pageSource = readSource(
			"app/(sidebar)/hrm/document-approvals/page.tsx",
		);
		const listSource = readSource(
			"app/(sidebar)/hrm/document-approvals/document-approval-list.tsx",
		);

		expect(pageSource.includes("ScrollableContent")).toBe(true);
		expect(pageSource.includes("getInitialTableSettings")).toBe(true);
		expect(pageSource.includes('"document-approvals"')).toBe(true);
		expect(pageSource.includes("initialSettings={initialSettings}")).toBe(true);
		expect(pageSource.includes("getQueryClient")).toBe(false);
		expect(pageSource.includes("fetchQuery")).toBe(false);
		expect(listSource.includes("DocumentApprovalsDataTable")).toBe(true);
		expect(listSource.includes("DocumentApprovalsColumnVisibility")).toBe(true);
		expect(listSource.includes("documents.map")).toBe(false);
		expect(listSource.includes("rounded-lg border p-4")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, persisted settings, and review actions", () => {
		const source = readSource(
			"components/tables-2/document-approvals/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="document-approvals-table-dnd"')).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("startFromColumn: 1")).toBe(true);
		expect(source.includes("onOpenReview")).toBe(true);
		expect(source.includes("onReview")).toBe(true);
	});

	it("keeps compact tailored columns, sticky actions, and table registration", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/document-approvals/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/document-approvals/table-header.tsx",
		);

		expect(settingsSource.includes('| "document-approvals"')).toBe(true);
		expect(configSource.includes('"document-approvals": {')).toBe(true);
		expect(configSource.includes('tableId: "document-approvals"')).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 320, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 340, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(132, 210, 154)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(112, 170, 128)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(156, 210, 172)")).toBe(true);
		expect(columnsSource.includes('className="size-8"')).toBe(true);
		expect(columnsSource.includes('className="h-8 px-2 text-xs"')).toBe(true);
		expect(columnsSource.includes("md:sticky md:left-0")).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
		expect(headerSource.includes("HorizontalPagination")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
	});
});
