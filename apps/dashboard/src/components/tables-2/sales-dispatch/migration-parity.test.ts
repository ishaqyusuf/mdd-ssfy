import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Dispatch Sales Orders table migration parity", () => {
	it("keeps all dispatch routes on the tables-2 module with saved table settings", () => {
		const dispatchRoute = readSource(
			"app/(sidebar)/(sales)/sales-book/dispatch/page.tsx",
		);
		const adminRoute = readSource(
			"app/(sidebar)/(sales)/sales-book/fulfillment/page.tsx",
		);
		const taskRoute = readSource(
			"app/(sidebar)/(sales)/sales-book/dispatch-task/page.tsx",
		);
		const adminListWorkspace = readSource(
			"components/dispatch-admin/fulfillment-list-workspace.tsx",
		);
		const adminCalendarWorkspace = readSource(
			"components/dispatch-admin/fulfillment-calendar-workspace.tsx",
		);
		const routeSource = `${dispatchRoute}\n${adminRoute}\n${adminListWorkspace}\n${taskRoute}`;

		expect(routeSource.includes("components/tables-2/sales-dispatch")).toBe(
			true,
		);
		expect(
			routeSource.includes('getInitialTableSettings("sales-dispatch")'),
		).toBe(true);
		expect(routeSource.includes("components/tables/sales-dispatch")).toBe(
			false,
		);
		expect(routeSource.includes("@gnd/ui/data-table")).toBe(false);
		expect(routeSource.includes("PageStickyHeader")).toBe(false);
		expect(dispatchRoute.includes("batchPrefetch([")).toBe(true);
		expect(adminRoute.match(/await batchPrefetch\(\[/g)?.length).toBe(2);
		expect(
			adminRoute.includes("trpc.dispatch.dispatchSummary.queryOptions()"),
		).toBe(true);
		for (const routeOnlyKey of [
			"section",
			"dispatchId",
			"dispatchSalesId",
			"exceptionId",
			"sheetMode",
			"detailTab",
			"exceptionStatus",
		]) {
			expect(adminRoute.includes(`${routeOnlyKey}: _${routeOnlyKey}`)).toBe(true);
		}
		expect(adminCalendarWorkspace.includes("DispatchCalendarView")).toBe(true);
		expect(taskRoute.includes("<DataTable driver")).toBe(true);
	});

	it("keeps the legacy admin dashboard canonical and the new workspace isolated at v2", () => {
		const adminRoute = readSource(
			"app/(sidebar)/(sales)/sales-book/fulfillment/page.tsx",
		);
		const adminV2Route = readSource(
			"app/(sidebar)/(sales)/sales-book/fulfillment/v2/page.tsx",
		);
		const workspaceClient = readSource(
			"components/dispatch-admin/dispatch-admin-workspace-client.tsx",
		);
		const adminListWorkspace = readSource(
			"components/dispatch-admin/fulfillment-list-workspace.tsx",
		);

		expect(adminListWorkspace.includes("AdminDispatchHeader")).toBe(true);
		expect(adminListWorkspace.includes("DispatchSummaryCards")).toBe(true);
		expect(adminListWorkspace.includes("DriverWorkloadCard")).toBe(true);
		expect(adminListWorkspace.includes("enableSalesMarkAs")).toBe(true);
		expect(adminRoute.includes("DispatchAdminWorkspaceClient")).toBe(false);
		expect(adminV2Route.includes("DispatchAdminWorkspaceClient")).toBe(true);
		expect(adminV2Route.includes("DispatchSheet")).toBe(true);
		expect(adminV2Route.includes('_role.is("Super Admin")')).toBe(true);
		expect(
			workspaceClient.includes("dispatch-calendar-view-v2"),
		).toBe(true);
	});

	it("keeps the table-owned scroll, header offset, DnD, selection, and bottom-bar behavior from Sales Orders", () => {
		const source = readSource(
			"components/tables-2/sales-dispatch/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="sales-dispatch-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("onRowSelectionChange: setRowSelection")).toBe(true);
		expect(source.includes("<BottomBar data={tableData}")).toBe(true);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
	});

	it("keeps compact header drag sorting hooks, select-all, action header, and resize behavior", () => {
		const source = readSource(
			"components/tables-2/sales-dispatch/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("useSortQuery")).toBe(true);
		expect(source.includes("table.toggleAllPageRowsSelected")).toBe(true);
		expect(source.includes("tableConfig.nonReorderableColumns")).toBe(true);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("reuses the sales Mark as workflow for single and batch dispatch actions", () => {
		const columnsSource = readSource(
			"components/tables-2/sales-dispatch/columns.tsx",
		);
		const bottomBarSource = readSource(
			"components/tables-2/sales-dispatch/bottom-bar.tsx",
		);
		const dispatchRoute = readSource(
			"app/(sidebar)/(sales)/sales-book/dispatch/page.tsx",
		);
		const taskRoute = readSource(
			"app/(sidebar)/(sales)/sales-book/dispatch-task/page.tsx",
		);

		expect(columnsSource.includes("<SalesMenu.MarkAs />")).toBe(true);
		expect(columnsSource.includes("isPendingDispatchStatus(item.status)")).toBe(
			true,
		);
		expect(
			bottomBarSource.includes("<SalesMenu.MarkAs asSubmenu={false} />"),
		).toBe(true);
		expect(
			bottomBarSource.includes("getDispatchSalesSelection(selectedDispatches)"),
		).toBe(true);
		const adminListWorkspace = readSource(
			"components/dispatch-admin/fulfillment-list-workspace.tsx",
		);
		expect(adminListWorkspace.includes("enableSalesMarkAs")).toBe(true);
		expect(dispatchRoute.includes("enableSalesMarkAs")).toBe(false);
		expect(taskRoute.includes("enableSalesMarkAs")).toBe(false);
	});

	it("gives Calendar a tab-owned workspace without list analytics or actions", () => {
		const adminRoute = readSource(
			"app/(sidebar)/(sales)/sales-book/fulfillment/page.tsx",
		);
		const calendarWorkspace = readSource(
			"components/dispatch-admin/fulfillment-calendar-workspace.tsx",
		);
		const tabs = readSource("components/dispatch-admin/fulfillment-tabs.ts");

		expect(tabs.includes('{ title: "Calendar", query: "tab=calendar" }')).toBe(
			true,
		);
		expect(adminRoute.includes('filter.tab === "calendar"')).toBe(true);
		expect(adminRoute.includes("getLegacyCalendarHref")).toBe(true);
		expect(adminRoute.includes("fulfillmentCalendar.queryOptions")).toBe(true);
		expect(calendarWorkspace.includes("FulfillmentPageTabs")).toBe(true);
		expect(calendarWorkspace.includes("DispatchCalendarView")).toBe(true);
		expect(calendarWorkspace.includes("DispatchSummaryCards")).toBe(false);
		expect(calendarWorkspace.includes("DispatchOverdueBanner")).toBe(false);
		expect(calendarWorkspace.includes("DispatchSearchFilter")).toBe(false);
		expect(calendarWorkspace.includes("DispatchAutoRefresh")).toBe(false);
		expect(calendarWorkspace.includes("SalesDispatchColumnVisibility")).toBe(
			false,
		);
	});

	it("keeps route defaults out of the dispatch search-filter chips", () => {
		const searchFilter = readSource("components/dispatch-search-filter.tsx");
		const filterParams = readSource("hooks/use-dispatch-filter-params.ts");

		expect(searchFilter.includes("dispatchTableSearchFilterParams")).toBe(true);
		expect(
			searchFilter.includes("filterSchema: dispatchFilterParamsSchema"),
		).toBe(false);
		expect(filterParams.includes("export const dispatchTableSearchFilterParams")).toBe(
			true,
		);
		for (const routeOnlyKey of [
			"section",
			"tab",
			"view",
			"calendarView",
			"detailTab",
			"exceptionStatus",
		]) {
			const tableSchema = filterParams.slice(
				filterParams.indexOf("export const dispatchTableSearchFilterParams"),
				filterParams.indexOf("export function useDispatchFilterParams"),
			);
			expect(tableSchema.includes(`${routeOnlyKey}:`)).toBe(false);
		}
	});

	it("keeps Sales Dispatch registered for compact table settings and content-tailored widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const dataTableSource = readSource(
			"components/tables-2/sales-dispatch/data-table.tsx",
		);
		const skeletonSource = readSource(
			"components/tables-2/sales-dispatch/skeleton.tsx",
		);
		const fulfillmentWorkspace = readSource(
			"components/dispatch-admin/fulfillment-list-workspace.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/sales-dispatch/columns.tsx",
		);
		const dispatchConfigSource = configSource.slice(
			configSource.indexOf('"sales-dispatch": {'),
			configSource.indexOf('"inbound-management": {'),
		);
		const salesOrdersConfigSource = configSource.slice(
			configSource.indexOf('"sales-orders": {'),
			configSource.indexOf('"sales-quotes": {'),
		);

		expect(settingsSource.includes('| "sales-dispatch"')).toBe(true);
		expect(dispatchConfigSource.includes('tableId: "sales-dispatch"')).toBe(true);
		expect(dispatchConfigSource.includes("rowHeight: 56")).toBe(true);
		expect(dispatchConfigSource.includes('style: "compact"')).toBe(true);
		expect(salesOrdersConfigSource.includes("rowHeight: 40")).toBe(true);
		expect(
			dataTableSource.includes(
				'rowHeight: TABLE_CONFIGS["sales-orders"].rowHeight',
			),
		).toBe(true);
		expect(
			skeletonSource.includes(
				'rowHeight: TABLE_CONFIGS["sales-orders"].rowHeight',
			),
		).toBe(true);
		expect(fulfillmentWorkspace.includes("<DataTable compact enableSalesMarkAs")).toBe(
			true,
		);
		expect(fulfillmentWorkspace.includes("<SalesDispatchSkeleton compact")).toBe(
			true,
		);
		expect(columnsSource.includes("if (compact)")).toBe(true);
		expect(columnsSource.includes("getCustomerPhone")).toBe(true);
		expect(columnsSource.includes("% ({pending} pending)")).toBe(true);
		expect(columnsSource.includes("{packed}/{total} packed")).toBe(true);
		expect(columnsSource.includes("sizes.custom(118, 180, 136)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(140, 230, 160)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(104, 150, 118)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 360, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(132, 220, 160)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(118, 180, 132)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(116, 170, 132)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(72, 72)")).toBe(true);
	});
});
