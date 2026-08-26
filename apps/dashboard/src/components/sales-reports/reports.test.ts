import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./reports.tsx", import.meta.url), "utf8");
const workspace = readFileSync(
	new URL("./workspace.tsx", import.meta.url),
	"utf8",
);
const unifiedMenu = readFileSync(
	new URL("../sales-report-menu.tsx", import.meta.url),
	"utf8",
);
const salesLayout = readFileSync(
	new URL("../../app/(sidebar)/(sales)/layout.tsx", import.meta.url),
	"utf8",
);
const salesNav = readFileSync(
	new URL("../sales-nav.tsx", import.meta.url),
	"utf8",
);
const accountingHeader = readFileSync(
	new URL("../sales-accounting-header.tsx", import.meta.url),
	"utf8",
);
const salesTaxDialog = readFileSync(
	new URL("../modals/sales-tax-report-dialog.tsx", import.meta.url),
	"utf8",
);

describe("Sales Reports export menu", () => {
	it("offers every governed sales-performance workbook", () => {
		for (const type of [
			"performance-summary",
			"orders-ledger",
			"sales-reps",
			"products",
			"quote-activity",
			"customers",
		]) {
			expect(source).toContain(`type: "${type}"`);
		}
	});

	it("uses the active period and the dedicated permission", () => {
		expect(source).toContain("params.from");
		expect(source).toContain("params.to");
		expect(source).toContain("params.salesRepIds");
		expect(source).toContain("params.salesChannels");
		expect(source).toContain("generateSalesPerformanceReport");
	});

	it("keeps finance-owned reports in Sales Finance", () => {
		expect(unifiedMenu).toContain('href: "/sales-book/finance"');
		expect(source).not.toContain('type: "payments"');
		expect(source).not.toContain('type: "receivables-aging"');
	});

	it("uses one descriptive report system in the global Sales header", () => {
		expect(unifiedMenu).toContain("SalesPerformanceReportMenuItems");
		expect(unifiedMenu).toContain("Sales reports workspace");
		expect(unifiedMenu).toContain("Sales Finance exports");
		expect(unifiedMenu).toContain("Receivables reports");
		expect(unifiedMenu).toContain("Customer statements");
		expect(unifiedMenu).toContain("Detailed product report");
		expect(unifiedMenu).toContain("Scheduled payment report");
		expect(unifiedMenu).toContain("{description}");
		expect(unifiedMenu).toContain('from "@gnd/ui/scroll-area"');
		expect(unifiedMenu).toContain("sm:grid-cols-2");
		expect(unifiedMenu).toContain("h-[min(30rem,calc(100vh-10rem))]");
		expect(unifiedMenu).toContain("w-[min(44rem,calc(100vw-2rem))]");
		expect(salesLayout).toContain("<SalesNav />");
		expect(salesNav).toContain("<SalesReportMenuDropdown");
		expect(salesNav).toContain("w-[min(44rem,calc(100vw-2rem))]");
		expect(accountingHeader).not.toContain("<SalesReportMenu");
		expect(workspace).not.toContain("actions={<SalesPerformanceReports />}");
	});

	it("uses the secondary variant for the Reports trigger mounted in the header", () => {
		expect(unifiedMenu).toMatch(
			/variant === "nav"[\s\S]{0,260}variant: "secondary"/,
		);
	});

	it("opens a permission-gated sales tax date dialog from Performance Excel", () => {
		expect(unifiedMenu).toContain("Sales Tax Report");
		expect(unifiedMenu).toContain("setSalesTaxReportOpen(true)");
		expect(salesTaxDialog).toContain("salesDashboard.salesTaxReport");
		expect(salesTaxDialog).toContain(
			"formatSalesTaxCalendarDate(selectedRange.from)",
		);
		expect(salesTaxDialog).toContain(
			"formatSalesTaxCalendarDate(selectedRange.to)",
		);
		expect(salesTaxDialog).toContain("Generate Excel");
		expect(salesTaxDialog).toContain(
			"!selectedRange.from || !selectedRange.to",
		);
		expect(salesTaxDialog).toContain("report.rowCount === 0");
		expect(salesTaxDialog).toContain("downloadSalesExcelWorkbook(report)");
		expect(salesTaxDialog).toContain("regardless of payment status");
		expect(salesTaxDialog).toContain('mode="range"');
		expect(salesTaxDialog).toContain("numberOfMonths={isWideCalendar ? 2 : 1}");
		expect(salesTaxDialog).toContain("isSelectableSalesTaxReportDate");
	});
});
