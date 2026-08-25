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
		expect(links).toContain(
			'_link("Fulfillment", "dispatch", "/sales-book/fulfillment/v2")',
		);
		expect(tabs).toContain('{ title: "Backlog", params: { section: "backlog" } }');
		expect(tabs).not.toContain('title: "Dashboard"');
		expect(tabs).not.toContain('title: "Dispatches"');
		const header = readDashboard(
			"components/dispatch-admin/dispatch-admin-header.tsx",
		);
		expect(header).toContain(
			'allActiveParam={{ key: "section", value: "dispatches" }}',
		);
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
		expect(header).toContain("summary.data?.backlog");
	});

	it("places tabs and search immediately above the All table", () => {
		const dashboard = readDashboard(
			"components/dispatch-admin/views/dispatch-dashboard-view.tsx",
		);
		const headerPosition = dashboard.indexOf("<DispatchAdminHeader />");
		expect(headerPosition).toBeGreaterThan(dashboard.indexOf("data.overdue"));
		expect(headerPosition).toBeLessThan(dashboard.indexOf("<DataTable"));
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
		expect(workspaceColumns).toContain('openDispatch(item.order?.orderId, item.id, "packing")');
		expect(workspaceColumns).not.toContain("openSheet(");
	});

	it("uses a permission-aware driver tile and role-prefilled employee modal", () => {
		const drivers = readDashboard(
			"components/dispatch-admin/views/dispatch-drivers-view.tsx",
		);
		const employeeModal = readDashboard("components/modals/employee-form-modal.tsx");
		expect(drivers).toContain('_perm.is("editEmployee")');
		expect(drivers).toContain('employeeRole: "Driver"');
		expect(employeeModal).toContain('"driver", "dispatch", "delivery"');
	});

	it("creates multiple selected orders atomically from a dialog", () => {
		const page = readDashboard(
			"app/(sidebar)/(sales)/sales-book/fulfillment/v2/page.tsx",
		);
		const dialog = readDashboard(
			"components/dispatch-admin/create-dispatch-dialog.tsx",
		);
		const route = readRepo("apps/api/src/trpc/routers/dispatch.route.ts");
		expect(page).toContain("CreateDispatchDialog");
		expect(dialog).toContain("MultipleSelector");
		expect(dialog).toContain("trpc.dispatch.backlog.queryOptions({ q: query");
		expect(dialog).toContain("salesIds: values.salesIds");
		expect(route).toContain("createDispatches: protectedProcedure");
		expect(route).toContain("props.ctx.db.$transaction");
	});
});
