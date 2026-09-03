import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dashboardRoot = join(import.meta.dir, "../..");
const repoRoot = join(dashboardRoot, "../../..");
const readDashboard = (path: string) =>
	readFileSync(join(dashboardRoot, path), "utf8");
const readRepo = (path: string) => readFileSync(join(repoRoot, path), "utf8");

describe("fulfillment V2 cutover contracts", () => {
	it("makes V2 the fulfillment link and exposes the simplified tabs", () => {
		const links = readDashboard("components/sidebar-links.ts");
		const tabs = readDashboard("components/dispatch-admin/dispatch-tabs.ts");
		const pageTabs = readDashboard("components/page-tabs/page-tabs.tsx");
		expect(links).toContain(
			'_link("Fulfillment", "dispatch", "/sales-book/fulfillment/v2")',
		);
		expect(tabs).toContain(
			'{ title: "Backlog", params: { section: "backlog" } }',
		);
		expect(tabs).toContain(
			'{ title: "All", params: { section: null }, clearQuery: true }',
		);
		expect(pageTabs).toContain(
			"if (tab.clearQuery) return normalizePagePath(basePath);",
		);
		expect(tabs).not.toContain('params: { section: "dispatches" }');
		expect(tabs.indexOf('title: "Backlog"')).toBeLessThan(
			tabs.indexOf('title: "All"'),
		);
		expect(tabs).not.toContain('title: "Dashboard"');
		expect(tabs).not.toContain('title: "Dispatches"');
		const header = readDashboard(
			"components/dispatch-admin/dispatch-admin-header.tsx",
		);
		expect(header).toContain("showAll={false}");
		expect(header).toContain("summaryData?.driverCount");
	});

	it("uses the standard selectable infinite table for backlog", () => {
		const backlogView = readDashboard(
			"components/dispatch-admin/views/dispatch-backlog-view.tsx",
		);
		const backlog = readDashboard(
			"components/tables-2/dispatch-backlog/data-table.tsx",
		);
		const columns = readDashboard(
			"components/tables-2/dispatch-backlog/columns.tsx",
		);
		expect(backlog).toContain("useSuspenseInfiniteQuery");
		expect(backlog).toContain("useInfiniteScroll<HTMLDivElement>");
		expect(backlog).toContain("VirtualRow");
		expect(backlog).toContain("rowSelection");
		expect(backlog).toContain("sort: backlogSort");
		expect(backlog).toContain("sortState={{");
		expect(backlog).toContain("createSortQuery: handleSort");
		expect(
			backlogView.indexOf("<DispatchAdminSummaryBoundary />"),
		).toBeLessThan(backlogView.indexOf("<DispatchAdminHeader />"));
		expect(backlogView.indexOf("<DispatchAdminHeader />")).toBeLessThan(
			backlogView.indexOf("<DataTable />"),
		);
		expect(columns).toContain('id: "createdAt"');
		expect(columns).toContain('sortField: "createdAt"');
		expect(columns).not.toContain('id: "dueDate"');
	});

	it("keeps only useful table actions and assigns semantic filter icons", () => {
		const header = readDashboard(
			"components/dispatch-admin/dispatch-admin-header.tsx",
		);
		for (const icon of ["Status", "calendar", "dispatch", "warning", "user"]) {
			expect(header).toContain(`icon: "${icon}"`);
		}
		expect(header).not.toContain("DispatchAutoRefresh");
		expect(header).not.toContain("DispatchExportButton");
		expect(header).not.toContain("ToggleGroup");
		expect(header).toContain("summaryData?.backlog");
		expect(header).toContain("isHydrated ? summary.data : undefined");
	});

	it("places tabs and search immediately above the All table", () => {
		const dashboard = readDashboard(
			"components/dispatch-admin/views/dispatch-dashboard-view.tsx",
		);
		const headerPosition = dashboard.indexOf("<DispatchAdminHeader />");
		expect(headerPosition).toBeGreaterThan(
			dashboard.indexOf("<DispatchAdminSummaryBoundary showOverdueAlert />"),
		);
		expect(headerPosition).toBeLessThan(dashboard.indexOf("<DataTable"));
	});

	it("streams independent prefetches and isolates summary and table failures", () => {
		const page = readDashboard(
			"app/(sidebar)/(sales)/sales-book/fulfillment/v2/page.tsx",
		);
		const boundaries = readDashboard(
			"components/dispatch-admin/dispatch-admin-boundaries.tsx",
		);
		const dashboard = readDashboard(
			"components/dispatch-admin/views/dispatch-dashboard-view.tsx",
		);

		expect(page).toContain(
			"void batchPrefetch([trpc.dispatch.workspaceSummary.queryOptions()]);",
		);
		expect(page).not.toContain(
			"await batchPrefetch([trpc.dispatch.workspaceSummary.queryOptions()]);",
		);
		expect(boundaries).toContain("DispatchAdminSummaryBoundary");
		expect(boundaries).toContain("DispatchDataBoundary");
		expect(boundaries).toContain("errorComponent={DispatchSummaryError}");
		expect(dashboard).toContain(
			"<DispatchAdminSummaryBoundary showOverdueAlert />",
		);
		expect(dashboard).toContain("<DispatchDataBoundary");
	});

	it("keeps fulfillment page tabs on their own row above search controls", () => {
		const listHeader = readDashboard(
			"components/dispatch-admin/admin-dispatch-header.tsx",
		);
		const dashboardHeader = readDashboard(
			"components/dispatch-admin/dispatch-admin-header.tsx",
		);
		const searchFilter = readDashboard("components/dispatch-search-filter.tsx");

		expect(dashboardHeader).toContain('pageTabsLayout="adaptive"');
		expect(listHeader).toContain("pageTabs={<FulfillmentPageTabs />}");
		expect(searchFilter).toContain(
			'pageTabsLayout={pageTabs ? "adaptive" : undefined}',
		);
	});

	it("opens Sales Overview Packing instead of the V2 dispatch sheet", () => {
		const page = readDashboard(
			"app/(sidebar)/(sales)/sales-book/fulfillment/v2/page.tsx",
		);
		const table = readDashboard(
			"components/tables-2/sales-dispatch/data-table.tsx",
		);
		const workspaceColumns = readDashboard(
			"components/tables-2/sales-dispatch/workspace-columns.tsx",
		);
		expect(page).not.toContain("DispatchSheet");
		expect(table).toContain("overviewQuery.openDispatch(");
		expect(table).not.toContain('sheetMode: "details"');
		expect(workspaceColumns).toContain(
			'openDispatch(item.order?.orderId, item.id, "packing")',
		);
		expect(workspaceColumns).not.toContain("openSheet(");
	});

	it("uses a permission-aware driver tile and role-prefilled employee modal", () => {
		const drivers = readDashboard(
			"components/dispatch-admin/views/dispatch-drivers-view.tsx",
		);
		const employeeModal = readDashboard(
			"components/modals/employee-form-modal.tsx",
		);
		expect(drivers).toContain('_perm.is("editEmployee")');
		expect(drivers).toContain('employeeRole: "Driver"');
		expect(employeeModal).toContain('"driver", "dispatch", "delivery"');
	});

	it("plans multiple dispatches with preserved per-order dates and an optional override", () => {
		const page = readDashboard(
			"app/(sidebar)/(sales)/sales-book/fulfillment/v2/page.tsx",
		);
		const dialog = readDashboard(
			"components/dispatch-admin/create-dispatch-dialog.tsx",
		);
		const orderPanel = readDashboard(
			"components/dispatch-admin/create-dispatch/order-panel.tsx",
		);
		const routePanel = readDashboard(
			"components/dispatch-admin/create-dispatch/route-panel.tsx",
		);
		const driverPanel = readDashboard(
			"components/dispatch-admin/create-dispatch/driver-panel.tsx",
		);
		const form = readDashboard(
			"components/dispatch-admin/dispatch/form-context.tsx",
		);
		const route = readRepo("apps/api/src/trpc/routers/dispatch.route.ts");
		expect(page).toContain("CreateDispatchDialog");
		expect(dialog).toContain("DispatchOrderPanel");
		expect(dialog).toContain("<CustomModal");
		expect(dialog).toContain('size="7xl"');
		expect(dialog).toContain(
			"lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,3fr)_auto_minmax(0,1fr)]",
		);
		expect(dialog).toContain(
			"overflow-x-hidden bg-background lg:overflow-hidden",
		);
		expect(dialog).toContain("min-w-0 border-0 bg-background");
		expect(dialog).toContain('<Separator\n\t\t\t\t\t\torientation="vertical"');
		expect(routePanel).not.toContain("lg:col-span-3");
		expect(dialog).toContain("trpc.dispatch.backlog.queryOptions({ q: query");
		expect(dialog).toContain("buildDispatchOrderDates");
		expect(dialog).toContain("overrideDueDate:");
		expect(orderPanel).toContain("CommandInput");
		expect(orderPanel).toContain("CommandItem");
		expect(orderPanel).toContain('placeholder="Search orders"');
		expect(orderPanel).toContain("onAdd(option)");
		expect(orderPanel).toContain("ToggleGroup");
		expect(orderPanel).not.toContain("MultipleSelector");
		expect(orderPanel).not.toContain(
			"Each selected order becomes its own dispatch.",
		);
		expect(orderPanel).not.toContain("Search by order, customer");
		expect(dialog).not.toContain(
			"Plan the orders, schedule, and driver before creating the batch.",
		);
		expect(dialog).toContain('if (value === "pickup")');
		expect(dialog).toContain('form.setValue("driverId", null');
		expect(dialog).toContain('disabled={deliveryMode === "pickup"}');
		expect(driverPanel).toContain("disabled={disabled}");
		expect(driverPanel).toContain('? "unassigned"');
		expect(routePanel).toContain("Batch delivery-date override");
		expect(form).toContain("batchDueDate: dateInputSchema.nullable()");
		expect(form).toContain("orderDueDates: z.record");
		expect(route).toContain("createDispatches: protectedProcedure");
		expect(route).toContain("props.ctx.db.$transaction");
		expect(route).toContain("resolveDispatchBatchDueDates");
		expect(route).toContain("dueDateBySalesId.get(salesId)");
	});

	it("keeps Backlog selected when the create dialog closes", () => {
		const dialog = readDashboard(
			"components/dispatch-admin/create-dispatch-dialog.tsx",
		);
		const closeBlock = dialog.slice(
			dialog.indexOf("const close ="),
			dialog.indexOf("return (", dialog.indexOf("const close =")),
		);

		expect(closeBlock).toContain("sheetMode: null");
		expect(closeBlock).toContain("dispatchSalesId: null");
		expect(closeBlock).not.toContain("section: null");
	});

	it("uses fulfillment-focused columns on Backlog and All", () => {
		const backlogColumns = readDashboard(
			"components/tables-2/dispatch-backlog/columns.tsx",
		);
		const allColumns = readDashboard(
			"components/tables-2/sales-dispatch/workspace-columns.tsx",
		);
		const sharedCells = readDashboard(
			"components/tables-2/sales-orders/order-finance-status-cells.tsx",
		);

		for (const id of [
			"createdAt",
			"orderId",
			"destination",
			"invoice",
			"status",
			"actions",
		]) {
			expect(backlogColumns).toContain(`id: "${id}"`);
		}
		for (const removed of [
			"customer",
			"deliveryMode",
			"driver",
			"packing",
			"risk",
		]) {
			expect(backlogColumns).not.toContain(`id: "${removed}"`);
		}
		expect(backlogColumns).toContain("SalesOrderInvoiceCell");
		expect(backlogColumns).toContain("SalesOrderStatusCell");
		expect(backlogColumns).toContain("<SalesMenu.MarkAs");
		expect(backlogColumns).toContain("Create dispatch for");

		for (const id of [
			"dueDate",
			"orderId",
			"destination",
			"driver",
			"packing",
			"invoice",
			"status",
			"actions",
		]) {
			expect(allColumns).toContain(`id: "${id}"`);
		}
		for (const removed of ["risk", "trip"]) {
			expect(allColumns).not.toContain(`id: "${removed}"`);
		}
		expect(allColumns).toContain("SalesOrderInvoiceCell");
		expect(allColumns).toContain("SalesOrderStatusCell");
		expect(allColumns).toContain("text-red-600");
		expect(sharedCells).toContain("auth.can?.editOrders");
		expect(sharedCells).toContain("editable ? (");
		expect(sharedCells).toContain("Apply Payment");
	});

	it("adds counted Active, due, and Completed workspaces and keeps analytics above Calendar", () => {
		const tabs = readDashboard("components/dispatch-admin/dispatch-tabs.ts");
		const header = readDashboard(
			"components/dispatch-admin/dispatch-admin-header.tsx",
		);
		const workspace = readDashboard(
			"components/dispatch-admin/dispatch-admin-workspace-client.tsx",
		);
		const activeView = readDashboard(
			"components/dispatch-admin/views/dispatch-active-view.tsx",
		);
		const completedView = readDashboard(
			"components/dispatch-admin/views/dispatch-completed-view.tsx",
		);
		const dataTable = readDashboard(
			"components/tables-2/sales-dispatch/data-table.tsx",
		);
		const calendarView = readDashboard(
			"components/dispatch-admin/views/dispatch-calendar-section.tsx",
		);
		const summaryQuery = readRepo(
			"apps/api/src/db/queries/dispatch-workspace.ts",
		);
		const dispatchQuery = readRepo("apps/api/src/db/queries/dispatch.ts");

		expect(tabs).toContain(
			'{ title: "Active", params: { section: "active", sort: "dueDate.asc" } }',
		);
		expect(tabs).toContain('title: "Due Today"');
		expect(tabs).toContain('section: "due-today"');
		expect(tabs).toContain('title: "Past Due"');
		expect(tabs).toContain('section: "past-due"');
		expect(tabs).toContain(
			'params: { section: "completed", sort: "deliveredAt.desc" }',
		);
		expect(tabs.indexOf('title: "Active"')).toBeLessThan(
			tabs.indexOf('title: "Due Today"'),
		);
		expect(tabs.indexOf('title: "Due Today"')).toBeLessThan(
			tabs.indexOf('title: "Past Due"'),
		);
		expect(tabs.indexOf('title: "Past Due"')).toBeLessThan(
			tabs.indexOf('title: "Completed"'),
		);
		expect(header).toContain("summaryData?.active");
		expect(header).toContain("summaryData?.dueToday");
		expect(header).toContain("summaryData?.pastDue");
		expect(header).toContain("summaryData?.completed");
		expect(workspace).toContain('filters.section === "active"');
		expect(workspace).toContain('filters.section === "due-today"');
		expect(workspace).toContain('filters.section === "past-due"');
		expect(workspace).toContain("<DispatchActiveView");
		expect(workspace).toContain('filters.section === "completed"');
		expect(workspace).toContain("<DispatchCompletedView");
		expect(activeView).not.toContain("activeDispatchStages");
		expect(completedView).toContain("<DataTable workspace");
		expect(dataTable).toContain("section: filters.section");
		expect(summaryQuery).toContain("active: activeIds.size");
		expect(summaryQuery).toContain("dueToday: dueTodayIds.size");
		expect(summaryQuery).toContain("pastDue: pastDueIds.size");
		expect(summaryQuery).toContain("completed: completedCount");
		expect(dispatchQuery).toContain('section !== "due-today"');
		expect(dispatchQuery).toContain('section !== "past-due"');
		expect(dispatchQuery).toContain('section === "due-today"');
		expect(dispatchQuery).toContain('["today"]');
		expect(dispatchQuery).toContain('["overdue"]');
		expect(workspace).toContain("<DispatchCalendarSection");
		expect(
			calendarView.indexOf("<DispatchAdminSummaryBoundary />"),
		).toBeLessThan(calendarView.indexOf("<DispatchAdminHeader />"));
		expect(calendarView.indexOf("<DispatchAdminHeader />")).toBeLessThan(
			calendarView.indexOf("<DispatchCalendarView />"),
		);
	});
});
