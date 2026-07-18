import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Email Ledger Sales Orders table migration parity", () => {
	it("keeps the email ledger route on the restarted table shell", () => {
		const routeSource = readSource(
			"app/(sidebar)/(sales)/sales-book/emails/page.tsx",
		);
		const pageSource = readSource("components/sales-email-ledger-page.tsx");

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(
			routeSource.includes('getInitialTableSettings("sales-email-ledger")'),
		).toBe(true);
		expect(pageSource.includes("SalesEmailLedgerColumnVisibility")).toBe(true);
		expect(pageSource.includes("SalesEmailLedgerSkeleton")).toBe(true);
		expect(
			pageSource.includes("components/tables-2/sales-email-ledger/data-table"),
		).toBe(true);
		expect(pageSource.includes("@gnd/ui/table")).toBe(false);
		expect(pageSource.includes("@gnd/ui/data-table")).toBe(false);
		expect(routeSource.includes("components/tables/skeleton")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize, and persisted settings", () => {
		const source = readSource(
			"components/tables-2/sales-email-ledger/data-table.tsx",
		);

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="sales-email-ledger-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("enableColumnResizing: true")).toBe(true);
		expect(source.includes("onColumnSizingChange: setColumnSizing")).toBe(true);
		expect(source.includes("onColumnOrderChange: setColumnOrder")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes("useSuspenseQuery")).toBe(true);
	});

	it("keeps compact tailored columns, resend action, and table registration", () => {
		const columnsSource = readSource(
			"components/tables-2/sales-email-ledger/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/sales-email-ledger/table-header.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(columnsSource.includes("sizes.custom(142, 210, 160)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 320, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(128, 220, 150)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(200, 420, 260)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(136, 240, 160)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 132, 116)")).toBe(true);
		expect(columnsSource.includes("onResend(attempt)")).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(settingsSource.includes('| "sales-email-ledger"')).toBe(true);
		expect(configSource.includes('"sales-email-ledger": {')).toBe(true);
		expect(configSource.includes('tableId: "sales-email-ledger"')).toBe(true);
		expect(configSource.includes("rowHeight: 56")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
	});
});
