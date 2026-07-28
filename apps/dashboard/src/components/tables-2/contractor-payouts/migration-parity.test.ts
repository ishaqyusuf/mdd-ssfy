import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Contractor Payouts Sales Orders table migration parity", () => {
	it("keeps the payments route shell aligned with Sales Orders without manual query fetching", () => {
		const source = readSource(
			"app/(sidebar)/contractors/jobs/payments/page.tsx",
		);

		expect(source.includes("ScrollableContent")).toBe(true);
		expect(source.includes("batchPrefetch([")).toBe(true);
		expect(
			source.includes('getInitialTableSettings("contractor-payouts")'),
		).toBe(true);
		expect(
			source.includes(
				"<PaymentsHistoryView initialSettings={initialSettings} />",
			),
		).toBe(true);
		expect(source.includes("PageStickyHeader")).toBe(false);
		expect(source.includes("getQueryClient")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps the payment history view on the restarted payout table and settings control", () => {
		const viewSource = readSource(
			"components/payment-dashboard/payments-history-view.tsx",
		);
		const headerSource = readSource("components/contractor-payouts-header.tsx");
		const lazySource = readSource(
			"components/payment-dashboard/lazy-payment-dashboard.tsx",
		);

		expect(
			viewSource.includes("components/tables-2/contractor-payouts/data-table"),
		).toBe(true);
		expect(viewSource.includes("ContractorPayoutsSkeleton")).toBe(true);
		expect(viewSource.includes("components/tables/contractor-payouts")).toBe(
			false,
		);
		expect(headerSource.includes("ContractorPayoutsColumnVisibility")).toBe(
			true,
		);
		expect(lazySource.includes("ContractorPayoutsSkeleton")).toBe(true);
		expect(lazySource.includes("components/tables/skeleton")).toBe(false);
	});

	it("keeps the payout detail route on the restarted shell and included-jobs table", () => {
		const routeSource = readSource(
			"app/(sidebar)/contractors/jobs/payments/[paymentId]/page.tsx",
		);
		const normalizedRouteSource = routeSource.replace(/\s+/g, "");
		const pageSource = readSource(
			"components/payment-dashboard/payment-overview-page.tsx",
		);
		const contentSource = readSource(
			"components/payment-dashboard/payment-overview-content.tsx",
		);

		expect(routeSource.includes("ScrollableContent")).toBe(true);
		expect(routeSource.includes("batchPrefetch([")).toBe(true);
		expect(normalizedRouteSource.includes("getInitialTableSettings(")).toBe(
			true,
		);
		expect(routeSource.includes('"contractor-payout-overview-jobs"')).toBe(
			true,
		);
		expect(routeSource.includes("getQueryClient")).toBe(false);
		expect(routeSource.includes("fetchQuery")).toBe(false);
		expect(pageSource.includes("PageShell")).toBe(false);
		expect(pageSource.includes("includedJobsInitialSettings")).toBe(true);
		expect(contentSource.includes("ContractorPayoutOverviewJobsTable")).toBe(
			true,
		);
		expect(contentSource.includes("data.jobs.map")).toBe(false);
		expect(contentSource.includes("getPayoutJobDisplay")).toBe(false);
	});

	it("keeps table-owned scroll, selection, DnD, and payout bottom-bar behavior", () => {
		const source = readSource(
			"components/tables-2/contractor-payouts/data-table.tsx",
		);

		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="contractor-payouts-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("onRowSelectionChange: setRowSelection")).toBe(true);
		expect(source.includes("<BottomBar data={tableData} />")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps compact tailored columns, header sorting, and table settings registration", () => {
		const columnsSource = readSource(
			"components/tables-2/contractor-payouts/columns.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/contractor-payouts/table-header.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(columnsSource.includes("sizes.custom(150, 240, 170)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 320, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 140, 116)")).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("horizontalListSortingStrategy")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("tableConfig.nonReorderableColumns")).toBe(
			true,
		);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(settingsSource.includes('| "contractor-payouts"')).toBe(true);
		expect(configSource.includes('"contractor-payouts": {')).toBe(true);
		expect(configSource.includes('tableId: "contractor-payouts"')).toBe(true);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
	});

	it("keeps payout detail included jobs on table-core mechanics and compact widths", () => {
		const tableSource = readSource(
			"components/tables-2/contractor-payout-overview-jobs/data-table.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/contractor-payout-overview-jobs/table-header.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/contractor-payout-overview-jobs/columns.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(tableSource.includes("VirtualRow")).toBe(true);
		expect(tableSource.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(tableSource.includes("useTableDnd(table)")).toBe(true);
		expect(tableSource.includes("<DndContext")).toBe(true);
		expect(
			tableSource.includes('id="contractor-payout-overview-jobs-table-dnd"'),
		).toBe(true);
		expect(tableSource.includes("enableColumnResizing: true")).toBe(true);
		expect(tableSource.includes("onColumnSizingChange: setColumnSizing")).toBe(
			true,
		);
		expect(tableSource.includes("onColumnOrderChange: setColumnOrder")).toBe(
			true,
		);
		expect(tableSource.includes("rowHeight={tableConfig.rowHeight}")).toBe(
			true,
		);
		expect(
			tableSource.includes("estimateSize: () => tableConfig.rowHeight"),
		).toBe(true);
		expect(tableSource.includes("startFromColumn: 1")).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("HorizontalPagination")).toBe(true);
		expect(headerSource.includes("DraggableHeader")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
		expect(settingsSource.includes('| "contractor-payout-overview-jobs"')).toBe(
			true,
		);
		expect(configSource.includes('"contractor-payout-overview-jobs": {')).toBe(
			true,
		);
		expect(configSource.includes("rowHeight: 64")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(220, 420, 280)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(190, 360, 240)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(110, 160, 122)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(112, 170, 128)")).toBe(true);
	});
});
