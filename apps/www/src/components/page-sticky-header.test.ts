import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const liveTableAuditRoots = ["app", "components", "features"];

const liveTableAuditIgnoredPathParts = [
	"components/tables-2/",
	"components/(clean-code)/data-table/",
	"components/_v1/data-table/",
	"components/common/data-table/",
	"app/_components/data-table/",
];

const liveTableAuditDeniedPatterns = [
	{ label: "@gnd/ui/data-table", pattern: /@gnd\/ui\/data-table/ },
	{ label: "@gnd/ui/table", pattern: /@gnd\/ui\/table/ },
	{ label: "components/tables/", pattern: /components\/tables\// },
	{ label: "@/components/tables/", pattern: /@\/components\/tables\// },
	{ label: "_v1/data-table", pattern: /_v1\/data-table/ },
	{ label: "common/data-table", pattern: /common\/data-table/ },
	{ label: "app/_components/data-table", pattern: /app\/_components\/data-table/ },
	{
		label: "components/(clean-code)/data-table/table-cells",
		pattern: /components\/\(clean-code\)\/data-table\/table-cells/,
	},
	{ label: "<table>", pattern: /<\/?table[\s>]/ },
	{ label: "<Table>", pattern: /<\/?Table[\s>.]/ },
];

const allowedCleanCodeDataTableFiles = [
	"components/(clean-code)/data-table/Dl.tsx",
	"components/(clean-code)/data-table/search-params.ts",
];

function collectLiveSourceFiles(directory: string): string[] {
	const entries = readdirSync(directory, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;
		const nextPath = resolve(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...collectLiveSourceFiles(nextPath));
			continue;
		}

		if (!entry.isFile()) continue;
		if (!/\.(ts|tsx)$/.test(entry.name)) continue;
		if (entry.name.endsWith(".d.ts")) continue;
		if (entry.name.includes(".test.")) continue;

		files.push(nextPath);
	}

	return files;
}

function collectLiveSourceFilesIfPresent(directory: string): string[] {
	if (!existsSync(directory)) return [];
	return collectLiveSourceFiles(directory);
}

function isIgnoredLiveTableAuditPath(sourcePath: string) {
	return liveTableAuditIgnoredPathParts.some((pathPart) =>
		sourcePath.includes(pathPart),
	);
}

const restartedTablePages = [
	{
		route: "app/(sidebar)/(sales)/sales-book/quotes/page.tsx",
		table: "components/tables-2/sales-quotes/data-table.tsx",
		tableImport: "components/tables-2/sales-quotes/data-table",
		legacyImport: "components/tables/sales-quotes",
	},
	{
		route: "app/(sidebar)/(sales)/sales-book/customers/page.tsx",
		table: "components/tables-2/customers/data-table.tsx",
		tableImport: "components/tables-2/customers/data-table",
		legacyImport: "components/tables/customers",
	},
	{
		route: "app/(sidebar)/(sales)/sales-book/dealers/page.tsx",
		surface: "components/dealers/dealers-admin-page.tsx",
		table: "components/tables-2/dealers/data-table.tsx",
		tableImport: "components/tables-2/dealers/data-table",
		legacyImport: "components/tables/dealers",
	},
	{
		route:
			"app/(sidebar)/(sales)/sales-book/accounting/resolution-center/page.tsx",
		surface: "components/sales-book/resolution-center-page.tsx",
		table: "components/tables-2/sales-resolution/data-table.tsx",
		tableImport: "components/tables-2/sales-resolution/data-table",
		legacyImport: "@gnd/ui/data-table",
	},
	{
		route: "app/(sidebar)/community/(main)/unit-invoices/page.tsx",
		table: "components/tables-2/unit-invoices/data-table.tsx",
		tableImport: "components/tables-2/unit-invoices/data-table",
		legacyImport: "components/tables/unit-invoices",
	},
	{
		route: "app/(sidebar)/community/(main)/templates/page.tsx",
		table: "components/tables-2/community-templates/data-table.tsx",
		tableImport: "components/tables-2/community-templates/data-table",
		legacyImport: "components/tables/community-templates",
	},
	{
		route: "app/(sidebar)/community/(main)/builders/page.tsx",
		table: "components/tables-2/community-builders/data-table.tsx",
		tableImport: "components/tables-2/community-builders/data-table",
		legacyImport: "getQueryClient",
	},
	{
		route: "app/(sidebar)/community/customer-services/page.tsx",
		table: "components/tables-2/customer-service/data-table.tsx",
		tableImport: "components/tables-2/customer-service/data-table",
		legacyImport: "components/tables/customer-service",
	},
	{
		route: "app/(sidebar)/hrm/employees/page.tsx",
		table: "components/tables-2/employees/data-table.tsx",
		tableImport: "components/tables-2/employees/data-table",
		legacyImport: "components/tables/employees",
	},
	{
		route: "app/(sidebar)/hrm/employees/v2/page.tsx",
		surface: "features/employee-management/components/employee-list-page.tsx",
		table: "components/tables-2/employees/data-table.tsx",
		tableImport: "components/tables-2/employees/data-table",
		legacyImport: "components/tables/employees",
	},
	{
		route: "app/(sidebar)/hrm/contractors/jobs/page.tsx",
		table: "components/tables-2/contractor-jobs/data-table.tsx",
		tableImport: "components/tables-2/contractor-jobs/data-table",
		legacyImport: "components/tables/contractor-jobs",
	},
	{
		route: "app/(sidebar)/(jobs-dashboard)/jobs-dashboard/jobs-list/page.tsx",
		surface: "components/jobs-dashboard/worker-jobs-list.tsx",
		table: "components/tables-2/contractor-jobs/data-table.tsx",
		tableImport: "components/tables-2/contractor-jobs/data-table",
		legacyImport: "components/tables/contractor-jobs",
	},
	{
		route: "app/(sidebar)/contractors/jobs/payments/page.tsx",
		surface: "components/payment-dashboard/payments-history-view.tsx",
		table: "components/tables-2/contractor-payouts/data-table.tsx",
		tableImport: "components/tables-2/contractor-payouts/data-table",
		legacyImport: "components/tables/contractor-payouts",
	},
	{
		route: "app/(sidebar)/contractors/jobs/payment-dashboard/page.tsx",
		surface: "components/payment-dashboard/index.tsx",
		table:
			"components/tables-2/payment-dashboard-recent-payments/data-table.tsx",
		tableImport:
			"components/tables-2/payment-dashboard-recent-payments/data-table",
		legacyImport: "recentPayments.map",
	},
	{
		route: "app/(sidebar)/site-actions/page.tsx",
		table: "components/tables-2/site-actions/data-table.tsx",
		tableImport: "components/tables-2/site-actions/data-table",
		legacyImport: "components/tables/site-actions",
	},
	{
		route: "app/(sidebar)/settings/short-links/page.tsx",
		surface: "components/settings/short-links-settings-page.tsx",
		table: "components/tables-2/short-links/data-table.tsx",
		tableImport: "components/tables-2/short-links/data-table",
		legacyImport: "@gnd/ui/table",
	},
	{
		route: "app/(sidebar)/sales/packing-list/page.tsx",
		surface: "app/(sidebar)/sales/packing-list/packing-list-client.tsx",
		table: "components/tables-2/packing-list/data-table.tsx",
		tableImport: "components/tables-2/packing-list/data-table",
		legacyImport: "components/tables/skeleton",
	},
	{
		route: "app/(sidebar)/(sales)/sales-book/shelf-items/page.tsx",
		surface: "components/sales-book/shelf-items-manager.tsx",
		table: "components/tables-2/shelf-items/data-table.tsx",
		tableImport: "components/tables-2/shelf-items/data-table",
		legacyImport: "components/tables/skeleton",
	},
	{
		route: "app/(sidebar)/(sales)/sales-book/emails/page.tsx",
		surface: "components/sales-email-ledger-page.tsx",
		table: "components/tables-2/sales-email-ledger/data-table.tsx",
		tableImport: "components/tables-2/sales-email-ledger/data-table",
		legacyImport: "@gnd/ui/table",
	},
	{
		route: "app/(sidebar)/task-events/diagnostics/page.tsx",
		surface:
			"app/(sidebar)/task-events/_components/task-run-diagnostics-dashboard.tsx",
		table: "components/tables-2/task-run-diagnostics/data-table.tsx",
		tableImport: "components/tables-2/task-run-diagnostics/data-table",
		legacyImport: "@gnd/ui/table",
	},
	{
		route: "app/(sidebar)/settings/master-password-logins/page.tsx",
		surface: "components/master-password-login-audit-page.tsx",
		table: "components/tables-2/master-password-logins/data-table.tsx",
		tableImport: "components/tables-2/master-password-logins/data-table",
		legacyImport: "@gnd/ui/table",
	},
	{
		route: "app/(sidebar)/inventory/allocations/page.tsx",
		surface: "components/inventory/inventory-allocation-review-page.tsx",
		table: "components/tables-2/inventory-allocations/data-table.tsx",
		tableImport: "components/tables-2/inventory-allocations/data-table",
		legacyImport: "components/tables/skeleton",
	},
	{
		route: "app/(sidebar)/inventory/variants/page.tsx",
		surface: "components/inventory/inventory-variants-workspace-page.tsx",
		table: "components/tables-2/inventory-variants/data-table.tsx",
		tableImport: "components/tables-2/inventory-variants/data-table",
		legacyImport: "components/tables/skeleton",
	},
	{
		route: "app/(sidebar)/inventory/backorders/page.tsx",
		surface: "components/inventory/inventory-backorder-queue-page.tsx",
		table: "components/tables-2/inventory-backorders/data-table.tsx",
		tableImport: "components/tables-2/inventory-backorders/data-table",
		legacyImport: "components/tables/skeleton",
	},
	{
		route: "app/(sidebar)/inventory/inbounds/page.tsx",
		surface: "components/inventory/inbound-receiving-page.tsx",
		table: "components/tables-2/inventory-inbounds/data-table.tsx",
		tableImport: "components/tables-2/inventory-inbounds/data-table",
		legacyImport: "components/tables/skeleton",
	},
	{
		route: "app/(sidebar)/inventory/partial-shipments/page.tsx",
		surface: "components/inventory/inventory-partial-shipment-page.tsx",
		table: "components/tables-2/inventory-partial-shipments/data-table.tsx",
		tableImport: "components/tables-2/inventory-partial-shipments/data-table",
		legacyImport: "components/tables/skeleton",
	},
	{
		route: "app/(sidebar)/inventory/dispatch-mode/page.tsx",
		surface: "components/inventory/inventory-dispatch-mode-page.tsx",
		table: "components/tables-2/inventory-dispatch-mode/data-table.tsx",
		tableImport: "components/tables-2/inventory-dispatch-mode/data-table",
		legacyImport: "components/tables/skeleton",
	},
	{
		route: "app/(sidebar)/inventory/production-plan/page.tsx",
		surface: "components/inventory/inventory-production-plan-page.tsx",
		table: "components/tables-2/inventory-production-plan/data-table.tsx",
		tableImport: "components/tables-2/inventory-production-plan/data-table",
		legacyImport: "components/tables/skeleton",
	},
	{
		route: "app/(sidebar)/inventory/review/page.tsx",
		surface: "components/inventory/inventory-kind-review-page.tsx",
		table: "components/tables-2/inventory-kind-review/data-table.tsx",
		tableImport: "components/tables-2/inventory-kind-review/data-table",
		legacyImport: "components/tables/skeleton",
	},
	{
		route: "app/(sidebar)/inventory/stocks/page.tsx",
		surface: "components/inventory/inventory-stock-operations-page.tsx",
		table: "components/tables-2/inventory-stock-audit/data-table.tsx",
		tableImport: "components/tables-2/inventory-stock-audit/data-table",
		legacyImport: "rows.map((row)",
	},
	{
		route: "app/(sidebar)/community/(main)/projects/page.tsx",
		table: "components/tables-2/community-projects/data-table.tsx",
		tableImport: "components/tables-2/community-projects/data-table",
		legacyImport: "components/tables/community-project",
	},
	{
		route: "app/(sidebar)/community/(main)/project-units/page.tsx",
		table: "components/tables-2/project-units/data-table.tsx",
		tableImport: "components/tables-2/project-units/data-table",
		legacyImport: "components/tables/project-units",
	},
	{
		route: "app/(sidebar)/community/(main)/unit-productions/page.tsx",
		table: "components/tables-2/unit-productions/data-table.tsx",
		tableImport: "components/tables-2/unit-productions/data-table",
		legacyImport: "components/tables/unit-productions",
	},
	{
		route: "app/(sidebar)/(sales)/sales-rep/page.tsx",
		table: "components/tables-2/sales-orders/data-table.tsx",
		tableImport: "components/tables-2/sales-orders/data-table",
		legacyImport: "components/tables/sales-orders/data-table",
	},
	{
		route: "app/(sidebar)/(sales)/sales-rep/page.tsx",
		table: "components/tables-2/sales-quotes/data-table.tsx",
		tableImport: "components/tables-2/sales-quotes/data-table",
		legacyImport: "components/tables/sales-quotes/data-table",
	},
	{
		route: "app/(sidebar)/(sales)/sales-rep/page.tsx",
		surface: "components/sales-rep-commission-payment.tsx",
		table: "components/tables-2/sales-rep-commission-payments/data-table.tsx",
		tableImport: "components/widgets/commission-payments",
		legacyImport: "@gnd/ui/table",
	},
	{
		route: "app/(sidebar)/(sales)/sales-rep/page.tsx",
		surface: "components/widgets/commission-payments/index.tsx",
		table: "components/tables-2/sales-rep-commission-payments/data-table.tsx",
		tableImport: "components/tables-2/sales-rep-commission-payments/data-table",
		legacyImport: "components/tables/table-header",
	},
	{
		route: "app/(sidebar)/(sales)/sales-rep/page.tsx",
		surface: "components/sales-rep-pending-comissions.tsx",
		table: "components/tables-2/sales-rep-commissions/data-table.tsx",
		tableImport: "components/widgets/comissions",
		legacyImport: "@gnd/ui/table",
	},
	{
		route: "app/(sidebar)/(sales)/sales-rep/page.tsx",
		surface: "components/widgets/comissions/index.tsx",
		table: "components/tables-2/sales-rep-commissions/data-table.tsx",
		tableImport: "components/tables-2/sales-rep-commissions/data-table",
		legacyImport: "components/tables/table-header",
	},
	{
		route:
			"app/(sidebar)/(sales-production-worker)/production/dashboard/page.tsx",
		surface: "components/production-workspace.tsx",
		table: "components/tables-2/sales-production/data-table.tsx",
		tableImport: "components/tables-2/sales-production/data-table",
		legacyImport: "components/tables/sales-production/data-table",
	},
	{
		route:
			"app/(clean-code)/(sales)/sales-book/(pages)/production-tasks/page.tsx",
		surface: "components/production-workspace.tsx",
		table: "components/tables-2/sales-production/data-table.tsx",
		tableImport: "components/tables-2/sales-production/data-table",
		legacyImport: "components/tables/sales-production/data-table",
	},
];

const restartedSearchSurfaceTargets = [
	{
		file: "components/sales-quote-search-filter.tsx",
		token: "SearchFilterAdapter",
	},
	{
		file: "components/customer-search-filter.tsx",
		token: "SearchFilterTRPC",
	},
	{
		file: "components/dealers/dealers-admin-page.tsx",
		token: "SavePageTabButton",
	},
	{
		file: "components/employee-header.tsx",
		token: "SearchFilterAdapter",
	},
	{
		file: "components/contractor-jobs-header.tsx",
		token: "SearchFilterAdapter",
	},
	{
		file: "components/community-project-header.tsx",
		token: "SearchFilterAdapter",
	},
	{
		file: "components/project-units-header.tsx",
		token: "SearchFilterAdapter",
	},
	{
		file: "components/unit-invoices-header.tsx",
		token: "SearchFilterAdapter",
	},
	{
		file: "components/community-template-header.tsx",
		token: "SearchFilterAdapter",
	},
	{
		file: "components/builder-header.tsx",
		token: "SearchFilterAdapter",
	},
	{
		file: "components/customer-service-header.tsx",
		token: "SearchFilterAdapter",
	},
	{
		file: "components/unit-productions-header.tsx",
		token: "SearchFilterAdapter",
	},
];

describe("Restarted table page audit", () => {
	it("keeps live app surfaces off legacy/raw table systems outside tables-2", () => {
		const failures = liveTableAuditRoots.flatMap((sourceRoot) =>
			collectLiveSourceFiles(resolve(root, sourceRoot)).flatMap((filePath) => {
				const sourcePath = relative(root, filePath).replaceAll("\\", "/");
				if (isIgnoredLiveTableAuditPath(sourcePath)) return [];

				const source = readFileSync(filePath, "utf8");
				return liveTableAuditDeniedPatterns
					.filter(({ pattern }) => pattern.test(source))
					.map(({ label }) => `${sourcePath}: ${label}`);
			}),
		);

		expect(failures).toEqual([]);
	});

	it("keeps retired clean-code, v1, and legacy component table helpers deleted", () => {
		const cleanCodeDataTableFiles = collectLiveSourceFiles(
			resolve(root, "components/(clean-code)/data-table"),
		).map((filePath) => relative(root, filePath).replaceAll("\\", "/"));
		const legacyComponentTableFiles = collectLiveSourceFilesIfPresent(
			resolve(root, "components/tables"),
		).map((filePath) => relative(root, filePath).replaceAll("\\", "/"));
		const v1DataTableFiles = collectLiveSourceFilesIfPresent(
			resolve(root, "components/_v1/data-table"),
		).map((filePath) => relative(root, filePath).replaceAll("\\", "/"));

		expect(cleanCodeDataTableFiles.sort()).toEqual(
			allowedCleanCodeDataTableFiles.sort(),
		);
		expect(legacyComponentTableFiles).toEqual([]);
		expect(v1DataTableFiles).toEqual([]);
	});

	it("keeps restarted pages off the failed shared sticky header and legacy table shells", () => {
		const failures = restartedTablePages.flatMap((target) => {
			const routeSource = readFileSync(resolve(root, target.route), "utf8");
			const surfaceSource =
				"surface" in target
					? readFileSync(resolve(root, target.surface), "utf8")
					: routeSource;
			const source = `${routeSource}\n${surfaceSource}`;
			const issues: string[] = [];

			if (source.includes("PageStickyHeader")) {
				issues.push(`${target.route}: PageStickyHeader`);
			}
			if (source.includes(target.legacyImport)) {
				issues.push(`${target.route}: ${target.legacyImport}`);
			}
			if (source.includes("@gnd/ui/data-table")) {
				issues.push(`${target.route}: @gnd/ui/data-table`);
			}
			if (source.includes("fetchInfiniteQuery")) {
				issues.push(`${target.route}: fetchInfiniteQuery`);
			}
			if (!source.includes("ScrollableContent")) {
				issues.push(`${target.route}: missing ScrollableContent`);
			}
			if (!surfaceSource.includes(target.tableImport)) {
				issues.push(`${target.route}: missing ${target.tableImport}`);
			}

			return issues;
		});

		expect(failures).toEqual([]);
	});

	it("keeps restarted tables on table-owned scroll and core row rendering", () => {
		const failures = restartedTablePages.flatMap((target) => {
			const source = readFileSync(resolve(root, target.table), "utf8");
			const issues: string[] = [];

			if (!source.includes("VirtualRow")) {
				issues.push(`${target.table}: missing VirtualRow`);
			}
			if (!source.includes("useScrollHeader(parentRef")) {
				issues.push(`${target.table}: missing table-owned useScrollHeader`);
			}
			if (!source.includes("rowHeight={tableConfig.rowHeight}")) {
				issues.push(`${target.table}: missing tableConfig rowHeight`);
			}

			return issues;
		});

		expect(failures).toEqual([]);
	});

	it("keeps saved-tab-capable search surfaces on restarted page headers", () => {
		const missing = restartedSearchSurfaceTargets.filter(({ file, token }) => {
			const source = readFileSync(resolve(root, file), "utf8");
			return !source.includes(token);
		});

		expect(missing).toEqual([]);
	});
});
