import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Finance Midday migration parity", () => {
	it("keeps Finance as a parallel route while Accounting remains available", () => {
		const routeSource = readSource(
			"app/(sidebar)/(sales)/sales-book/finance/page.tsx",
		);
		const sidebarSource = readSource("components/sidebar-links.ts");

		expect(routeSource.includes("Sales Finance")).toBe(true);
		expect(routeSource.includes("SalesFinanceWorkspaceClient")).toBe(true);
		expect(
			routeSource.includes('getInitialTableSettings("sales-finance")'),
		).toBe(true);
		expect(sidebarSource.includes("/sales-book/finance")).toBe(true);
		expect(sidebarSource.includes("/sales-book/accounting")).toBe(true);
	});

	it("keeps customer identity visible by default with the agreed fallback", () => {
		const columnsSource = readSource(
			"components/tables-2/sales-finance/columns.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");

		expect(columnsSource.includes('header: "Customer"')).toBe(true);
		expect(columnsSource.includes('accessorKey: "customerName"')).toBe(true);
		expect(columnsSource.includes('"Unnamed customer"')).toBe(true);
		expect(
			settingsSource.includes('"sales-finance": ["feeAmount", "recordedBy"]'),
		).toBe(true);
		expect(configSource.includes('"sales-finance": {')).toBe(true);
		expect(configSource.includes('tableId: "sales-finance"')).toBe(true);
		expect(configSource.includes('"sales-finance": "customer"')).toBe(true);
	});

	it("keeps the table resizable, reorderable, virtualized, and internally scrollable", () => {
		const tableSource = readSource(
			"components/tables-2/sales-finance/data-table.tsx",
		);
		const headerSource = readSource(
			"components/tables-2/sales-accounting/table-header.tsx",
		);

		expect(tableSource.includes("useVirtualizer")).toBe(true);
		expect(tableSource.includes("useTableDnd(table)")).toBe(true);
		expect(tableSource.includes("<DndContext")).toBe(true);
		expect(tableSource.includes('id="sales-finance-table-dnd"')).toBe(true);
		expect(tableSource.includes("enableColumnResizing: true")).toBe(true);
		expect(tableSource.includes("onColumnSizingChange: setColumnSizing")).toBe(
			true,
		);
		expect(tableSource.includes("onColumnOrderChange: setColumnOrder")).toBe(
			true,
		);
		expect(tableSource.includes("overflow-auto overscroll-contain")).toBe(true);
		expect(headerSource.includes("SortableContext")).toBe(true);
		expect(headerSource.includes("ResizeHandle")).toBe(true);
	});

	it("keeps URL-driven review, filtering, and transaction detail behavior", () => {
		const filterSource = readSource("hooks/use-sales-finance-filter-params.ts");
		const headerSource = readSource("components/sales-finance/header.tsx");
		const tabsSource = readSource("components/sales-finance/tabs.ts");
		const reportsSource = readSource("components/sales-finance/reports.tsx");
		const insightsSource = readSource("components/sales-finance/insights.tsx");
		const workspaceSource = readSource(
			"components/sales-finance/workspace-client.tsx",
		);
		const routerSource = readSource(
			"../../api/src/trpc/routers/sales-finance.route.ts",
		);
		const iconSource = readSource(
			"../../../packages/ui/src/components/custom/search-filter/search-utils.tsx",
		);
		const searchFilterStateSource = readSource("hooks/use-search-filter.ts");
		const tableSource = readSource(
			"components/tables-2/sales-finance/data-table.tsx",
		);
		const sheetSource = readSource(
			"components/sales-finance/transaction-sheet.tsx",
		);

		expect(filterSource.includes("parseAsStringLiteral")).toBe(true);
		expect(filterSource.includes("dateRange")).toBe(true);
		expect(filterSource.includes("transactionId")).toBe(true);
		expect(filterSource.includes("application")).toBe(true);
		expect(headerSource.includes("SearchFilterProvider")).toBe(true);
		expect(headerSource.includes("SearchFilterTRPC")).toBe(true);
		expect(headerSource.includes("<PageTabs")).toBe(true);
		expect(tabsSource.includes('title: "Review queue"')).toBe(true);
		expect(headerSource.includes("<SalesFinanceReports />")).toBe(true);
		expect(reportsSource.includes("downloadSalesFinanceExcel")).toBe(true);
		expect(reportsSource.includes("active view and filters")).toBe(true);
		expect(reportsSource.includes("generateSalesPaymentReport")).toBe(true);
		expect(routerSource.includes('["generateSalesPaymentReport"]')).toBe(true);
		expect(routerSource.includes("getSalesFinanceAnalytics")).toBe(true);
		expect(insightsSource.includes("salesFinance.analytics")).toBe(true);
		expect(insightsSource.includes("Collections trend")).toBe(true);
		expect(insightsSource.includes("Payment method mix")).toBe(true);
		expect(insightsSource.includes("Review health")).toBe(true);
		expect(insightsSource.includes("active view and filters")).toBe(true);
		expect(workspaceSource.includes("dynamic(")).toBe(true);
		expect(workspaceSource.includes("SalesFinanceInsightsSkeleton")).toBe(true);
		expect(iconSource.includes('paymentMethods: "payment"')).toBe(true);
		expect(iconSource.includes('statuses: "Status"')).toBe(true);
		expect(iconSource.includes('applicationStatuses: "accounting"')).toBe(true);
		expect(iconSource.includes('exceptionCodes: "warning"')).toBe(true);
		expect(
			searchFilterStateSource.includes(
				"isArray && Array.isArray(parsedValue) ? parsedValue[0] : parsedValue",
			),
		).toBe(true);
		expect(tableSource.includes("setParams({ transactionId:")).toBe(true);
		expect(sheetSource.includes("transactionDetail")).toBe(true);
	});

	it("keeps core Finance tabs stable even when their datasets are empty", () => {
		const headerSource = readSource("components/sales-finance/header.tsx");
		const receivablesHeaderSource = readSource(
			"components/sales-finance/receivables-header.tsx",
		);
		const resolutionHeaderSource = readSource(
			"components/sales-finance/resolution-header.tsx",
		);
		const tabsSource = readSource("components/sales-finance/tabs.ts");
		const pageTabsSource = readSource("components/page-tabs/page-tabs.tsx");

		for (const source of [
			headerSource,
			receivablesHeaderSource,
			resolutionHeaderSource,
		]) {
			expect(source.includes("tabs={salesFinancePageTabs}")).toBe(true);
		}
		expect(tabsSource.includes('title: "Review queue"')).toBe(true);
		expect(tabsSource.includes('params: { tab: "review" }')).toBe(true);
		expect(tabsSource.includes('title: "Receivables"')).toBe(true);
		expect(tabsSource.includes('params: { tab: "receivables" }')).toBe(true);
		expect(tabsSource.includes('title: "Resolution Center"')).toBe(true);
		expect(tabsSource.includes('params: { tab: "resolution" }')).toBe(true);
		expect(pageTabsSource.includes('title: "All"')).toBe(true);
		expect(
			pageTabsSource.includes("const shouldFetch = tabs === undefined"),
		).toBe(true);
	});

	it("adds a protected account resolution workspace and payment-sheet corrections", () => {
		const filterSource = readSource("hooks/use-sales-finance-filter-params.ts");
		const workspaceSource = readSource(
			"components/sales-finance/workspace-client.tsx",
		);
		const resolutionHeaderSource = readSource(
			"components/sales-finance/resolution-header.tsx",
		);
		const resolutionTableSource = readSource(
			"components/tables-2/sales-resolution/data-table.tsx",
		);
		const resolutionColumnsSource = readSource(
			"components/tables-2/sales-resolution/columns.tsx",
		);
		const paymentPanelSource = readSource(
			"components/sales-finance/payment-resolution-panel.tsx",
		);
		const sheetSource = readSource(
			"components/sales-finance/transaction-sheet.tsx",
		);
		const routerSource = readSource(
			"../../api/src/trpc/routers/sales-finance.route.ts",
		);
		const querySource = readSource("../../api/src/db/queries/sales-finance.ts");

		expect(filterSource.includes('"resolution"')).toBe(true);
		expect(workspaceSource.includes('params.tab === "resolution"')).toBe(true);
		expect(workspaceSource.includes("SalesFinanceResolutionHeader")).toBe(true);
		expect(workspaceSource.includes("financeMode")).toBe(true);
		expect(resolutionHeaderSource.includes("SearchFilterProvider")).toBe(true);
		expect(
			resolutionHeaderSource.includes("SalesResolutionColumnVisibility"),
		).toBe(true);
		expect(resolutionTableSource.includes("salesFinance.resolutions")).toBe(
			true,
		);
		expect(resolutionColumnsSource.includes("resolutionSyncBalance")).toBe(
			true,
		);
		expect(sheetSource.includes("SalesFinancePaymentResolutionPanel")).toBe(
			true,
		);
		expect(paymentPanelSource.includes("editOrderPayment")).toBe(true);
		expect(paymentPanelSource.includes("resolutionPayment")).toBe(true);
		expect(routerSource.includes("resolutionPayment: protectedProcedure")).toBe(
			true,
		);
		expect(
			routerSource.includes("resolutionSyncBalance: protectedProcedure"),
		).toBe(true);
		expect(
			(routerSource.match(/\["editOrderPayment"\]/g)?.length || 0) > 3,
		).toBe(true);
		expect(querySource.includes("repairLegacySalesPaymentBalance")).toBe(true);
		expect(querySource.includes("sales.finance.account-resolution.")).toBe(
			true,
		);
	});

	it("adds a Midday-standard receivables workspace and filter-aware Excel reports", () => {
		const filterSource = readSource("hooks/use-sales-finance-filter-params.ts");
		const workspaceSource = readSource(
			"components/sales-finance/workspace-client.tsx",
		);
		const headerSource = readSource(
			"components/sales-finance/receivables-header.tsx",
		);
		const reportsSource = readSource(
			"components/sales-finance/receivables-reports.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/sales-finance-receivables/columns.tsx",
		);
		const tableSource = readSource(
			"components/tables-2/sales-finance-receivables/data-table.tsx",
		);
		const sheetSource = readSource(
			"components/sales-finance/receivable-sheet.tsx",
		);
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const iconSource = readSource(
			"../../../packages/ui/src/components/custom/search-filter/search-utils.tsx",
		);
		const routerSource = readSource(
			"../../api/src/trpc/routers/sales-finance.route.ts",
		);

		expect(filterSource.includes('"receivables"')).toBe(true);
		expect(filterSource.includes("dueDateRange")).toBe(true);
		expect(filterSource.includes("agingBuckets")).toBe(true);
		expect(filterSource.includes("receivableId")).toBe(true);
		expect(workspaceSource.includes('params.tab === "receivables"')).toBe(true);
		expect(workspaceSource.includes("SalesFinanceReceivablesSummary")).toBe(
			true,
		);
		expect(headerSource.includes("SearchFilterProvider")).toBe(true);
		expect(headerSource.includes('label: "Due date"')).toBe(true);
		expect(headerSource.includes('label: "Aging"')).toBe(true);
		expect(iconSource.includes('dueDateRange: "calendar"')).toBe(true);
		expect(iconSource.includes('agingBuckets: "calendar"')).toBe(true);
		expect(columnsSource.includes('header: "Customer"')).toBe(true);
		expect(columnsSource.includes('"Unnamed customer"')).toBe(true);
		expect(tableSource.includes("useVirtualizer")).toBe(true);
		expect(
			tableSource.includes('id="sales-finance-receivables-table-dnd"'),
		).toBe(true);
		expect(tableSource.includes("overflow-auto overscroll-contain")).toBe(true);
		expect(sheetSource.includes("receivableDetail")).toBe(true);
		expect(
			settingsSource.includes(
				'"sales-finance-receivables": ["reconciliation", "salesRep"]',
			),
		).toBe(true);
		expect(configSource.includes('"sales-finance-receivables": {')).toBe(true);
		expect(reportsSource.includes('"receivables-aging"')).toBe(true);
		expect(reportsSource.includes('"receivables-customers"')).toBe(true);
		expect(
			reportsSource.includes("active due-date, aging, and search filters"),
		).toBe(true);
		expect(routerSource.includes("receivablesReport: protectedProcedure")).toBe(
			true,
		);
		expect(routerSource.includes('["generateSalesPaymentReport"]')).toBe(true);
	});

	it("adds audited reconciliation without mutating financial evidence", () => {
		const panelSource = readSource(
			"components/sales-finance/reconciliation-panel.tsx",
		);
		const sheetSource = readSource(
			"components/sales-finance/transaction-sheet.tsx",
		);
		const columnsSource = readSource(
			"components/tables-2/sales-finance/columns.tsx",
		);
		const routerSource = readSource(
			"../../api/src/trpc/routers/sales-finance.route.ts",
		);
		const querySource = readSource("../../api/src/db/queries/sales-finance.ts");

		expect(sheetSource.includes("<SalesFinanceReconciliationPanel")).toBe(true);
		expect(panelSource.includes("reconciliationStart")).toBe(true);
		expect(panelSource.includes("reconciliationResolve")).toBe(true);
		expect(panelSource.includes("Reopen reconciliation")).toBe(true);
		expect(panelSource.includes("Audit history")).toBe(true);
		expect(columnsSource.includes("reconciliationStatus")).toBe(true);
		expect(routerSource.includes('["editOrderPayment"]')).toBe(true);
		expect(querySource.includes('"sales.finance.reconciliation."')).toBe(true);
		expect(
			querySource.includes("buildSalesFinanceReconciliationFingerprint"),
		).toBe(true);
		expect(
			querySource.includes("buildSalesFinanceReconciliationEvidence"),
		).toBe(true);
	});

	it("tracks parallel adoption without auto-retiring legacy Accounting", () => {
		const adoptionSource = readSource("components/sales-finance/adoption.tsx");
		const workspaceSource = readSource(
			"components/sales-finance/workspace-client.tsx",
		);
		const legacySource = readSource(
			"components/sales-book/accounting-page.tsx",
		);
		const headerSource = readSource("components/sales-finance/header.tsx");
		const receivablesHeaderSource = readSource(
			"components/sales-finance/receivables-header.tsx",
		);
		const routerSource = readSource(
			"../../api/src/trpc/routers/sales-finance.route.ts",
		);
		const querySource = readSource("../../api/src/db/queries/sales-finance.ts");

		expect(adoptionSource.includes("adoptionPing")).toBe(true);
		expect(adoptionSource.includes("adoptionReadiness")).toBe(true);
		expect(adoptionSource.includes("Legacy retained")).toBe(true);
		expect(workspaceSource.includes("<SalesFinanceAdoptionTracker")).toBe(true);
		expect(
			legacySource.includes(
				'<SalesFinanceAdoptionTracker surface="legacy-accounting" />',
			),
		).toBe(true);
		expect(headerSource.includes("<SalesFinanceAdoptionStatus />")).toBe(true);
		expect(
			receivablesHeaderSource.includes("<SalesFinanceAdoptionStatus />"),
		).toBe(true);
		expect(routerSource.includes("adoptionPing: protectedProcedure")).toBe(
			true,
		);
		expect(routerSource.includes("adoptionReadiness: protectedProcedure")).toBe(
			true,
		);
		expect(querySource.includes("retirementEligible: false")).toBe(true);
		expect(querySource.includes("Explicit legacy retirement approval")).toBe(
			true,
		);
	});
});
